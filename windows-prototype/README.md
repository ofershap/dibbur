# Windows dictation prototype

A separate Python Windows prototype contributed by **Gina1** in [issue #2](https://github.com/ofershap/dibbur/issues/2). It uses the ivrit-ai Hebrew model and faster-whisper, with Left Ctrl + Left Shift push-to-talk and local clipboard paste. The original contribution and source archive digest are recorded in [SOURCE.md](SOURCE.md).

This is experimental source, not a Windows release of Dibbur's Rust/Tauri app. It does not change the Mac app. No Windows installer or binary is published here.

## Try from source on Windows

1. Install 64-bit Python 3.12 and select Add to PATH.
2. Keep this directory somewhere permanent, for example `C:\Apps\HebrewDictation`.
3. Run `install.bat`. Review the package installation output if it fails. Installation and first use need internet for packages and model downloads. Auto-start at sign-in is optional.
4. Wait for the ready indicator, focus a text field, hold Left Ctrl + Left Shift, speak and release.

See [README.txt](README.txt) for settings, stopping, uninstalling, and removing startup. Models may require several GB of disk space. CPU-only recognition may be slow. This source setup installs third-party Python packages from PyPI; dependency versions are not locked.

## Privacy

Inference runs locally. Audio stays in memory and is not written to disk by this app. Transcript logging is off by default (`log_text: false`). Text is temporarily put on the system clipboard, so Windows clipboard history, cloud clipboard sync, or the receiving app can retain it under their own settings. The app restores the previous clipboard only if it has not changed since the paste.

## Verification

The contributor reports Windows 11 Pro testing on an i7-10510U with an NVIDIA MX250, including Hebrew/English transcription and paste with a Hebrew keyboard layout. These are contributor-reported results, not independent maintainer verification.

Maintainer checks: Python syntax and portable mocked regression tests for model readiness, hotkeys, clipboard behavior and cleanup. Run them with no microphone or model downloads:

```sh
python -m unittest discover -s windows-prototype/tests -v
```

Still requires native Windows checks: clean installation, live microphone, actual Hebrew accuracy, CPU-only use, CUDA DLL loading, tray UI, startup shortcut, and paste into real apps. Mixed Hebrew/English accuracy is not established. Do not use it for sensitive dictation before reviewing the settings and testing on your machine.
