EXPERIMENTAL SOURCE PROTOTYPE - see README.md for verification limits and attribution.

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
  Use the "Hebrew Dictation" Desktop shortcut. Starting with Windows is optional during setup.
  Look for the blue microphone icon near the clock (it may be under the ^ arrow).
  Right-click it to pause the app or quit.

SETTINGS  (config.json in this folder; quit and restart the app after editing)
  language        "auto" (Hebrew/English), "he" or "en"
  hold_delay_sec  how long you hold Ctrl+Shift before the indicator appears (config: 0.1 sec)
  beam_size       1 = fastest, 5 = slightly more accurate but slower
  beeps           true / false
  device          "auto" (uses the NVIDIA graphics card), or "cpu" (very slow on this laptop)

  log_text        false (default) = your dictated text is never saved; true = written to dictation.log

PRIVACY
  Installation and first model download require internet. Inference runs locally.
  Audio and text are not sent to an online transcription provider.
  To detect the Ctrl+Shift hotkey, the app listens to all keyboard presses, like every
  dictation/hotkey app. It only reacts to Ctrl+Shift and does not record or store other keys.
  Audio starts buffering when both hotkey keys are held, including the short hold delay.
  Audio is never saved to disk.

PROBLEMS
  See dictation.log in this folder (timings and error types; text only if log_text is enabled).
  To remove automatic startup: press Win+R, open shell:startup, delete Hebrew Dictation.lnk.
  To uninstall: quit the tray app, remove its shortcuts, then delete this folder.
  Downloaded models remain in the Hugging Face cache unless removed separately.
