"""
Hebrew Dictation for Windows
Hold LEFT CTRL + LEFT SHIFT, talk, release -> the text is pasted where your cursor is.
Works in any app: WhatsApp Web, LinkedIn, Word, Gmail...
Runs fully offline with the ivrit.ai Hebrew Whisper model.
"""
import json
import os
import queue
import sys
import threading
import time
import winsound

import numpy as np
import pyperclip
import sounddevice as sd
import tkinter as tk
from PIL import Image, ImageDraw
from pynput import keyboard
import pystray

APP_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(APP_DIR, "config.json")
LOG_PATH = os.path.join(APP_DIR, "dictation.log")

DEFAULT_CONFIG = {
    "hebrew_model": "ivrit-ai/whisper-large-v3-turbo-ct2",
    "english_model": "small",    # also used to detect Hebrew vs English
    "language": "auto",          # "auto" (Hebrew/English), "he" or "en"
    "device": "auto",            # "auto" (graphics card if possible), "cuda" or "cpu"
    "hold_delay_sec": 0.3,       # how long Ctrl+Shift must be held before dictation
    "min_audio_sec": 0.5,
    "beam_size": 1,              # 1 = fastest; 5 = a bit more accurate, slower
    "beeps": True,
    "add_trailing_space": True,
    "log_text": False,           # True = also write what you said into dictation.log (for debugging)
}

SAMPLE_RATE = 16000


def log(msg):
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + str(msg) + "\n")
    except Exception:
        pass


def load_config():
    cfg = dict(DEFAULT_CONFIG)
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            cfg.update(json.load(f))
    except FileNotFoundError:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CONFIG, f, indent=2, ensure_ascii=False)
    except Exception as e:
        log(f"config error: {e}")
    return cfg


CFG = dict(DEFAULT_CONFIG)
# Load user settings only when starting the app, never on module import.
NVIDIA_DLL_HANDLES = []


def beep(kind):
    if not CFG["beeps"]:
        return
    freq, dur = {"start": (880, 70), "stop": (660, 70), "error": (300, 200)}[kind]
    threading.Thread(target=winsound.Beep, args=(freq, dur), daemon=True).start()


# ---------------------------------------------------------------- recorder
class Recorder:
    def __init__(self):
        self.stream = None
        self.chunks = []
        self.lock = threading.Lock()

    def _cb(self, indata, frames, t, status):
        with self.lock:
            self.chunks.append(indata.copy())

    def start(self):
        with self.lock:
            self.chunks = []
        self.stream = sd.InputStream(samplerate=SAMPLE_RATE, channels=1,
                                     dtype="float32", callback=self._cb)
        self.stream.start()

    def stop(self):
        if self.stream is not None:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:
                pass
            self.stream = None
        with self.lock:
            if not self.chunks:
                return np.zeros(0, dtype=np.float32)
            return np.concatenate(self.chunks)[:, 0]


# ---------------------------------------------------------------- transcriber
def _add_nvidia_dlls():
    """Let CTranslate2 find the CUDA libraries installed via pip (nvidia-cublas/cudnn)."""
    try:
        import nvidia.cublas, nvidia.cudnn
        for p in list(nvidia.cublas.__path__) + list(nvidia.cudnn.__path__):
            b = os.path.join(p, "bin")
            if os.path.isdir(b):
                NVIDIA_DLL_HANDLES.append(os.add_dll_directory(b))
                os.environ["PATH"] = b + os.pathsep + os.environ["PATH"]
    except Exception as e:
        log(f"no nvidia libs: {e}")


class Transcriber:
    """Hebrew -> ivrit.ai model. English -> standard Whisper model (ivrit.ai can't do English).
    The English model also decides which language you spoke."""

    def __init__(self, on_ready):
        self.he = None
        self.en = None
        self.error = None
        self.device = None
        threading.Thread(target=self._load, args=(on_ready,), daemon=True).start()

    def _make(self, name):
        from faster_whisper import WhisperModel
        if CFG["device"] in ("auto", "cuda"):
            try:
                m = WhisperModel(name, device="cuda", compute_type="int8_float32")
                self.device = "cuda"
                return m
            except Exception as e:
                log(f"GPU failed for {name}, using CPU: {e}")
                if CFG["device"] == "cuda":
                    raise
        self.device = "cpu"
        return WhisperModel(name, device="cpu", compute_type="int8", cpu_threads=4)

    def _load(self, on_ready):
        try:
            _add_nvidia_dlls()
            lang = CFG["language"]
            if lang in ("auto", "he"):
                log(f"loading {CFG['hebrew_model']}")
                self.he = self._make(CFG["hebrew_model"])
            if lang in ("auto", "en"):
                log(f"loading {CFG['english_model']}")
                self.en = self._make(CFG["english_model"])
            # Warm-up: the first run is always slow, so do it now instead of on your first sentence
            silence = (np.random.randn(SAMPLE_RATE * 2) * 0.01).astype(np.float32)
            for m in (self.he, self.en):
                if m is not None:
                    self._run(m, silence, "he" if m is self.he else "en")   # loads VAD too
                    list(m.transcribe(silence, language="he" if m is self.he else "en",
                                      beam_size=1, without_timestamps=True)[0])
            if self.en is not None and lang == "auto":
                self.en.detect_language(silence)
            log(f"models ready on {self.device}")
        except Exception as e:
            self.error = type(e).__name__
            log("model load failed: " + self.error)
        on_ready()

    @property
    def model(self):
        return self.he or self.en

    @property
    def ready(self):
        lang = CFG["language"]
        return not self.error and (
            (lang == "auto" and self.he is not None and self.en is not None)
            or (lang == "he" and self.he is not None)
            or (lang == "en" and self.en is not None)
        )

    def _run(self, model, audio, language):
        segments, _ = model.transcribe(
            audio, language=language, beam_size=CFG["beam_size"], vad_filter=True,
            condition_on_previous_text=False, without_timestamps=True)
        return " ".join(s.text.strip() for s in segments).strip()

    def transcribe(self, audio):
        if not self.ready:
            raise RuntimeError("Configured speech models are not ready")
        lang = CFG["language"]
        if lang == "auto":
            _, _, probs = self.en.detect_language(audio)
            probs = dict(probs)
            lang = "he" if probs.get("he", 0) >= probs.get("en", 0) else "en"
            log(f"language: {lang} (he={probs.get('he', 0):.2f} en={probs.get('en', 0):.2f})")
        return self._run(self.he if lang == "he" else self.en, audio, lang)


# ---------------------------------------------------------------- paste
def paste_text(text):
    try:
        old = pyperclip.paste()
    except Exception:
        old = None
    pyperclip.copy(text)
    try:
        time.sleep(0.05)
        # Physical VK codes also work while the Hebrew keyboard layout is active.
        import ctypes
        u32 = ctypes.windll.user32
        VK_CONTROL, VK_V, KEYUP = 0x11, 0x56, 0x0002
        deadline = time.monotonic() + 3
        while any(u32.GetAsyncKeyState(k) & 0x8000 for k in (0xA0, 0xA1, 0xA2, 0xA3)):
            if time.monotonic() >= deadline:
                raise TimeoutError("Release Ctrl and Shift before pasting")
            time.sleep(0.02)
        try:
            u32.keybd_event(VK_CONTROL, 0x1D, 0, 0)
            u32.keybd_event(VK_V, 0x2F, 0, 0)
            time.sleep(0.02)
        finally:
            u32.keybd_event(VK_V, 0x2F, KEYUP, 0)
            u32.keybd_event(VK_CONTROL, 0x1D, KEYUP, 0)
        log("pasted")
        time.sleep(0.4)
    finally:
        # Do not erase a clipboard change made by the user or another app.
        if old is not None:
            try:
                if pyperclip.paste() == text:
                    pyperclip.copy(old)
            except Exception:
                pass


# ---------------------------------------------------------------- indicator window
class Indicator:
    COLORS = {"rec": "#e53935", "busy": "#f9a825", "load": "#757575", "err": "#6d4c41"}

    def __init__(self, root):
        self.root = root
        self.win = tk.Toplevel(root)
        self.win.overrideredirect(True)
        self.win.attributes("-topmost", True)
        self.win.attributes("-alpha", 0.92)
        self.win.configure(bg="#202124")
        self.dot = tk.Canvas(self.win, width=16, height=16, bg="#202124", highlightthickness=0)
        self.dot.pack(side="left", padx=(12, 6), pady=8)
        self.oval = self.dot.create_oval(2, 2, 14, 14, fill="#e53935", outline="")
        self.label = tk.Label(self.win, text="", fg="white", bg="#202124",
                              font=("Segoe UI", 11))
        self.label.pack(side="left", padx=(0, 14), pady=8)
        self.win.withdraw()

    def show(self, text, kind):
        self.label.config(text=text)
        self.dot.itemconfig(self.oval, fill=self.COLORS[kind])
        self.win.update_idletasks()
        w = self.win.winfo_reqwidth()
        sw = self.win.winfo_screenwidth()
        sh = self.win.winfo_screenheight()
        self.win.geometry(f"+{(sw - w) // 2}+{sh - 130}")
        self.win.deiconify()
        self.win.lift()

    def hide(self):
        self.win.withdraw()


# ---------------------------------------------------------------- app
class App:
    def __init__(self):
        global CFG
        CFG = load_config()
        if CFG["language"] not in ("auto", "he", "en"):
            raise ValueError("language must be auto, he or en")
        if CFG["device"] not in ("auto", "cpu", "cuda"):
            raise ValueError("device must be auto, cpu or cuda")
        self.root = tk.Tk()
        self.root.withdraw()
        self.ui_queue = queue.Queue()
        self.indicator = Indicator(self.root)
        self.recorder = Recorder()
        self.state = "loading"      # loading | idle | armed | recording | busy | error
        self.ctrl_down_at = None
        self.held = set()
        self.enabled = True
        self.ui("show", "טוען מודל עברית... (בפעם הראשונה זה לוקח כמה דקות)", "load")
        self.transcriber = Transcriber(lambda: self.ui("model_ready"))
        self._start_tray()
        self.listener = keyboard.Listener(on_press=self._on_press, on_release=self._on_release,
                                          win32_event_filter=self._filter)
        self.listener.start()
        # Ctrl+click / Ctrl+scroll (zoom) are normal actions, not dictation
        from pynput import mouse
        self.mouse_listener = mouse.Listener(
            on_click=lambda *a: self._cancel_if_armed(),
            on_scroll=lambda *a: self._cancel_if_armed())
        self.mouse_listener.start()
        self.root.after(50, self._pump)

    def _cancel_if_armed(self):
        if self.state in ("armed", "recording"):
            was_recording = self.state == "recording"
            self.recorder.stop()
            self.state = "idle"
            self.ctrl_down_at = None
            if was_recording:
                self.ui("hide")

    # ---- thread-safe UI calls
    def ui(self, *args):
        self.ui_queue.put(args)

    def _pump(self):
        try:
            while True:
                cmd, *a = self.ui_queue.get_nowait()
                if cmd == "model_ready":
                    self._model_ready()
                elif cmd == "show":
                    self.indicator.show(*a)
                elif cmd == "hide":
                    self.indicator.hide()
                elif cmd == "hide_later":
                    self.root.after(a[0], self.indicator.hide)
                elif cmd == "quit":
                    self.root.quit()
                    return
        except queue.Empty:
            pass
        if self.state == "armed" and self.ctrl_down_at and \
                time.time() - self.ctrl_down_at >= CFG["hold_delay_sec"]:
            self.state = "recording"
            beep("start")
            self.ui("show", "מקשיב... שחררו את המקשים לסיום", "rec")
        self.root.after(30, self._pump)

    def _model_ready(self):
        if not self.transcriber.ready:
            self.state = "error"
            self.ui("show", "שגיאה בטעינת המודל. ראו dictation.log", "err")
            beep("error")
        else:
            self.state = "idle"
            self.ui("show", "מוכן! החזיקו Ctrl+Shift שמאליים ודברו", "load")
            self.ui("hide_later", 2500)

    # ---- keyboard
    @staticmethod
    def _filter(msg, data):
        # Ignore keystrokes we inject ourselves (our own Ctrl+V)
        return not (data.flags & 0x10)

    # Hotkey = Left Ctrl + Left Shift held together (in any order)
    HOTKEY = {"ctrl": (keyboard.Key.ctrl_l,), "shift": (keyboard.Key.shift, keyboard.Key.shift_l)}

    def _which(self, key):
        for name, keys in self.HOTKEY.items():
            if key in keys:
                return name
        return None

    def _on_press(self, key):
        name = self._which(key)
        if name is None:
            # Any other key while holding = a normal shortcut (Ctrl+Shift+T etc.), not dictation
            self._cancel_if_armed()
            return
        self.held.add(name)
        if len(self.held) == 2 and self.state == "idle" and self.enabled:
            self.ctrl_down_at = time.time()
            try:
                self.recorder.start()   # start right away so the first word isn't cut
                self.state = "armed"
            except Exception as e:
                log("mic error: " + type(e).__name__)
                self.ui("show", "לא נמצא מיקרופון", "err")
                self.ui("hide_later", 2500)

    def _on_release(self, key):
        name = self._which(key)
        if name is None:
            return
        self.held.discard(name)
        if self.state == "armed":           # short tap, not dictation
            self.recorder.stop()
            self.state = "idle"
        elif self.state == "recording":
            audio = self.recorder.stop()
            beep("stop")
            self.state = "busy"
            threading.Thread(target=self._process, args=(audio,), daemon=True).start()
        self.ctrl_down_at = None

    def _process(self, audio):
        try:
            if len(audio) < CFG["min_audio_sec"] * SAMPLE_RATE:
                self.ui("hide")
                return
            self.ui("show", "ממיר לטקסט...", "busy")
            t0 = time.time()
            text = self.transcriber.transcribe(audio)
            shown = text if CFG["log_text"] else f"[{len(text)} chars]"
            log(f"{len(audio)/SAMPLE_RATE:.1f}s audio -> {time.time()-t0:.1f}s: {shown}")
            self.ui("hide")
            if text and self.enabled:
                if CFG["add_trailing_space"]:
                    text += " "
                paste_text(text)
        except Exception as e:
            log("transcribe failed: " + type(e).__name__)
            beep("error")
            self.ui("show", "שגיאה בהמרה", "err")
            self.ui("hide_later", 2500)
        finally:
            self.state = "idle"

    # ---- tray
    def _icon_image(self):
        img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.ellipse((4, 4, 60, 60), fill=(25, 118, 210))
        d.rounded_rectangle((24, 14, 40, 38), radius=8, fill="white")
        d.arc((18, 24, 46, 46), 0, 180, fill="white", width=3)
        d.line((32, 46, 32, 52), fill="white", width=3)
        return img

    def _toggle(self, icon, item):
        self.enabled = not self.enabled
        if not self.enabled:
            self._cancel_if_armed()

    def _open_folder(self, icon, item):
        os.startfile(APP_DIR)

    def _quit(self, icon, item):
        icon.stop()
        self.enabled = False
        self._cancel_if_armed()
        self.listener.stop()
        self.mouse_listener.stop()
        self.recorder.stop()
        self.ui("quit")

    def _start_tray(self):
        menu = pystray.Menu(
            pystray.MenuItem("פעיל (Ctrl+Shift שמאליים)", self._toggle, checked=lambda i: self.enabled),
            pystray.MenuItem("פתח תיקיית הגדרות", self._open_folder),
            pystray.MenuItem("יציאה", self._quit),
        )
        self.icon = pystray.Icon("HebrewDictation", self._icon_image(),
                                 "הקלדה קולית - החזיקו Ctrl+Shift שמאליים", menu)
        self.icon.run_detached()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    # Single instance guard
    import ctypes
    ctypes.windll.kernel32.CreateMutexW.restype = ctypes.c_void_p
    mutex = ctypes.windll.kernel32.CreateMutexW(None, False, "HebrewDictationSingleInstance")
    if not mutex:
        raise ctypes.WinError()
    if ctypes.windll.kernel32.GetLastError() == 183:
        sys.exit(0)
    try:
        App().run()
    except Exception:
        log("fatal error (details suppressed to protect dictated text)")
        raise
