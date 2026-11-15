"""Hardware-free regression tests. No app import, microphone, model or installer run."""
import ast
import json
import os
from pathlib import Path
import queue
import sys
import tempfile
import time
import types
import unittest
from unittest.mock import Mock, patch

SOURCE = Path(__file__).resolve().parents[1] / 'dictation.py'


def definitions():
    tree = ast.parse(SOURCE.read_text(encoding='utf-8'))
    wanted = {'log', 'load_config', 'paste_text', 'Recorder', 'Transcriber', 'App', '_add_nvidia_dlls'}
    selected = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n.name in wanted]
    keyboard = types.SimpleNamespace(Key=types.SimpleNamespace(ctrl_l='ctrl_l', shift='shift', shift_l='shift_l'))
    cfg = {'language': 'auto', 'device': 'auto', 'beeps': False, 'hold_delay_sec': .1,
           'min_audio_sec': .5, 'beam_size': 5, 'add_trailing_space': True, 'log_text': False,
           'hebrew_model': 'he', 'english_model': 'en'}
    ns = {'keyboard': keyboard, 'CFG': cfg, 'DEFAULT_CONFIG': dict(cfg), 'time': time,
          'threading': types.SimpleNamespace(Thread=Mock()), 'log': Mock(), 'beep': Mock(),
          'SAMPLE_RATE': 16000, 'os': os, 'json': json, 'queue': queue,
          'NVIDIA_DLL_HANDLES': [], 'pyperclip': Mock(), 'np': Mock(), 'sd': Mock()}
    exec(compile(ast.Module(body=selected, type_ignores=[]), str(SOURCE), 'exec'), ns)
    ns['log'] = Mock()
    return ns


class PrototypeTests(unittest.TestCase):
    def setUp(self):
        self.n = definitions()

    def app(self, state='idle'):
        app = self.n['App'].__new__(self.n['App'])
        app.state, app.enabled, app.ctrl_down_at, app.held = state, True, None, set()
        app.recorder = Mock()
        app.ui = Mock()
        app.transcriber = Mock()
        app.listener, app.mouse_listener = Mock(), Mock()
        return app

    def transcriber(self, he=None, en=None, error=None):
        t = self.n['Transcriber'].__new__(self.n['Transcriber'])
        t.he, t.en, t.error = he, en, error
        return t

    def test_whole_source_compiles(self):
        compile(SOURCE.read_text(encoding='utf-8'), str(SOURCE), 'exec')

    def test_auto_requires_both_models(self):
        self.assertFalse(self.transcriber(he=Mock()).ready)
        self.assertFalse(self.transcriber(en=Mock()).ready)
        self.assertTrue(self.transcriber(he=Mock(), en=Mock()).ready)

    def test_hebrew_only_needs_hebrew(self):
        self.n['CFG']['language'] = 'he'
        self.assertTrue(self.transcriber(he=Mock()).ready)
        self.assertFalse(self.transcriber(en=Mock()).ready)

    def test_english_only_needs_english(self):
        self.n['CFG']['language'] = 'en'
        self.assertTrue(self.transcriber(en=Mock()).ready)

    def test_loading_error_blocks_partial_models(self):
        t = self.transcriber(he=Mock(), en=Mock(), error='RuntimeError')
        self.assertFalse(t.ready)
        with self.assertRaises(RuntimeError):
            t.transcribe([])

    def test_auto_routes_hebrew_and_english(self):
        t = self.transcriber(he=Mock(), en=Mock())
        t._run = Mock(return_value='text')
        for lang, he_prob, en_prob, model in [('he', .8, .1, t.he), ('en', .1, .8, t.en)]:
            t.en.detect_language.return_value = (lang, .8, [('he', he_prob), ('en', en_prob)])
            self.assertEqual(t.transcribe([1]), 'text')
            t._run.assert_called_with(model, [1], lang)

    def test_partial_model_ready_callback_shows_error(self):
        a = self.app('loading')
        a.transcriber = self.transcriber(he=Mock())
        a._model_ready()
        self.assertEqual(a.state, 'error')

    def test_both_hotkey_orders_arm(self):
        for order in [('ctrl_l', 'shift_l'), ('shift_l', 'ctrl_l')]:
            a = self.app()
            for key in order:
                a._on_press(key)
            self.assertEqual(a.state, 'armed')
            a.recorder.start.assert_called_once()

    def test_single_ctrl_never_records(self):
        a = self.app()
        a._on_press('ctrl_l')
        a.recorder.start.assert_not_called()

    def test_regular_shortcut_cancels_recording(self):
        a = self.app('recording')
        a._on_press('t')
        self.assertEqual(a.state, 'idle')
        a.recorder.stop.assert_called_once()
        a.ui.assert_called_with('hide')

    def test_short_tap_discards_recording(self):
        a = self.app('armed')
        a._on_release('shift_l')
        self.assertEqual(a.state, 'idle')
        self.n['threading'].Thread.assert_not_called()

    def test_release_processes_once(self):
        a = self.app('recording')
        a._on_release('ctrl_l')
        a._on_release('shift_l')
        self.assertEqual(a.state, 'busy')
        self.n['threading'].Thread.assert_called_once()

    def test_pause_stops_active_recording(self):
        a = self.app('recording')
        a._toggle(None, None)
        self.assertFalse(a.enabled)
        self.assertEqual(a.state, 'idle')
        a.recorder.stop.assert_called_once()

    def test_disabled_never_arms(self):
        a = self.app()
        a.enabled = False
        a._on_press('ctrl_l')
        a._on_press('shift_l')
        a.recorder.start.assert_not_called()

    def test_quit_stops_both_hooks_and_recorder(self):
        a = self.app('recording')
        icon = Mock()
        a._quit(icon, None)
        a.listener.stop.assert_called_once()
        a.mouse_listener.stop.assert_called_once()
        self.assertFalse(a.enabled)
        a.ui.assert_called_with('quit')

    def test_injected_keyboard_events_are_ignored(self):
        self.assertFalse(self.n['App']._filter(0, types.SimpleNamespace(flags=0x10)))
        self.assertTrue(self.n['App']._filter(0, types.SimpleNamespace(flags=0)))

    def clipboard(self, old='old', changed=None, held=False):
        cp = self.n['pyperclip']
        cp.paste.side_effect = [old, changed if changed is not None else 'dictated']
        u32 = Mock()
        u32.GetAsyncKeyState.return_value = 0x8000 if held else 0
        ctypes = types.SimpleNamespace(windll=types.SimpleNamespace(user32=u32))
        clock = types.SimpleNamespace(sleep=Mock(), monotonic=Mock(side_effect=[0, 4]))
        self.n['time'] = clock
        with patch.dict(sys.modules, {'ctypes': ctypes}):
            if held:
                with self.assertRaises(TimeoutError):
                    self.n['paste_text']('dictated')
            else:
                self.n['paste_text']('dictated')
        return cp, u32

    def test_paste_restores_unchanged_clipboard(self):
        cp, u32 = self.clipboard()
        self.assertEqual(cp.copy.call_args_list[-1].args, ('old',))
        self.assertEqual(u32.keybd_event.call_args_list[1].args[0], 0x56)
        self.assertEqual(u32.keybd_event.call_count, 4)

    def test_paste_preserves_new_clipboard_content(self):
        cp, _ = self.clipboard(changed='new user copy')
        self.assertEqual(cp.copy.call_count, 1)

    def test_held_modifiers_abort_without_typing(self):
        cp, u32 = self.clipboard(held=True)
        u32.keybd_event.assert_not_called()
        self.assertEqual(cp.copy.call_args_list[-1].args, ('old',))

    def test_short_audio_returns_to_idle_without_transcription(self):
        a = self.app('busy')
        a._process([])
        self.assertEqual(a.state, 'idle')
        a.transcriber.transcribe.assert_not_called()

    def test_default_logs_do_not_include_transcript(self):
        a = self.app('busy')
        a.transcriber.transcribe.return_value = 'private dictated words'
        self.n['paste_text'] = Mock()
        a._process([0] * 16000)
        self.assertNotIn('private dictated words', str(self.n['log'].call_args_list))
        self.n['paste_text'].assert_called_with('private dictated words ')

    def test_paused_during_transcription_does_not_paste(self):
        a = self.app("busy")
        a.enabled = False
        a.transcriber.transcribe.return_value = "words"
        self.n["paste_text"] = Mock()
        a._process([0] * 16000)
        self.n["paste_text"].assert_not_called()

    def test_error_log_does_not_include_exception_text(self):
        a = self.app('busy')
        a.transcriber.transcribe.side_effect = RuntimeError('secret dictated words')
        a._process([0] * 16000)
        self.assertNotIn('secret dictated words', str(self.n['log'].call_args_list))
        self.assertEqual(a.state, 'idle')

    def test_installer_startup_is_opt_in_and_fail_fast(self):
        r = SOURCE.parent
        batch = (r / 'install.bat').read_text()
        self.assertIn('choice /C YN', batch)
        self.assertIn('if errorlevel 1 goto :failed', batch)
        ps = (r / 'create_shortcuts.ps1').read_text()
        self.assertIn('param([switch]$Startup)', ps)
        self.assertIn('if ($Startup)', ps)


if __name__ == '__main__':
    unittest.main()
