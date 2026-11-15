Hebrew Dictation (הקלדה קולית) for Windows
===========================================

INSTALL (new computer)
  1. Install Python 3.12 from python.org (tick "Add python.exe to PATH").
  2. Unzip this folder somewhere permanent (e.g. C:\Apps\HebrewDictation), not in Downloads.
  3. Double-click install.bat. First start downloads the Hebrew model (~1.6 GB).
  Works best with an NVIDIA graphics card; without one it is much slower.

HOW TO USE
  Click into a text box (WhatsApp Web, LinkedIn, anywhere).
  Hold LEFT CTRL + LEFT SHIFT together (any order), wait for the beep, talk, then let go.
  The text is pasted where your cursor is (about 4 sec for Hebrew, 2 sec for English).
  Normal shortcuts (Ctrl+C, Ctrl+Shift+T, Ctrl+click...) still work as usual.

START / STOP
  Starts automatically with Windows. There's also a "Hebrew Dictation" icon on the Desktop.
  Look for the blue microphone icon near the clock (it may be under the ^ arrow).
  Right-click it to pause the app or quit.

SETTINGS  (config.json in this folder; quit and restart the app after editing)
  language        "auto" (Hebrew/English), "he" or "en"
  hold_delay_sec  how long you hold Ctrl before it starts recording (default 0.3)
  beam_size       1 = fastest, 5 = slightly more accurate but slower
  beeps           true / false
  device          "auto" (uses the NVIDIA graphics card), or "cpu" (very slow on this laptop)

  log_text        false (default) = your dictated text is never saved; true = written to dictation.log

PRIVACY
  Fully offline: audio and text never leave this computer (ivrit.ai model runs locally).
  To detect the Ctrl+Shift hotkey, the app listens to all keyboard presses, like every
  dictation/hotkey app. It only reacts to Ctrl+Shift and does not record or store other keys.
  Audio is recorded only while you hold Ctrl+Shift, and is never saved to disk.

PROBLEMS
  See dictation.log in this folder (timings and errors only, not your text).
