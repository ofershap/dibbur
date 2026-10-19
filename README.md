<p align="center">
  <img src="assets/logo.png" alt="Dibbur logo" width="120" height="120" />
</p>

<h1 align="center">Dibbur (דיבור)</h1>

<p align="center">
  <strong>Hebrew voice dictation for Mac that actually works.</strong><br>
  Press a shortcut, speak Hebrew, and the text appears in any app. Free, open source, and fully offline.
</p>

<p align="center">
  לוחצים על קיצור, מדברים עברית, והטקסט מופיע איפה שהסמן נמצא. בחינם, בקוד פתוח, והכל נשאר על המחשב.
</p>

<p align="center">
  <a href="https://github.com/ofershap/dibbur/releases/latest"><img src="https://img.shields.io/github/v/release/ofershap/dibbur?label=Download" alt="Download" /></a>
  <a href="https://github.com/ofershap/dibbur/actions/workflows/test.yml"><img src="https://github.com/ofershap/dibbur/actions/workflows/test.yml/badge.svg" alt="Tests" /></a>
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey?logo=apple" alt="macOS" />
  <img src="https://img.shields.io/badge/speech_Whisper-ivrit--ai_large--v3--turbo-blueviolet" alt="ivrit-ai Whisper large-v3-turbo" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
</p>

---

Dibbur is a free, open-source alternative to Wispr Flow and Dragon for Hebrew speakers. It is a fork of [Handy](https://github.com/cjpais/Handy) (MIT) with one goal: make open-source dictation actually good in Hebrew.

## Why Dibbur?

- **Hebrew accuracy first** - ships with the [ivrit-ai](https://huggingface.co/ivrit-ai) Whisper large-v3-turbo model (Apache-2.0), the strongest open Hebrew speech model: about 7% word-error rate on real WhatsApp Hebrew per the [ivrit-ai leaderboard](https://huggingface.co/spaces/ivrit-ai/hebrew-transcription-leaderboard), ahead of the big commercial APIs on Hebrew.
- **Private by default** - speech-to-text runs on your Mac. Your voice never leaves the computer.
- **Works in every app** - hold your shortcut, talk, release: the text is pasted wherever your cursor is - WhatsApp, Gmail, Docs, Cursor.
- **Optional AI cleanup (off by default)** - removes Hebrew filler words (אממ, כאילו, נו...), fixes punctuation, keeps your language. Works with a free API key (Gemini, Groq), a local model through Ollama, or Apple Intelligence.

## Install (macOS)

1. Download the DMG from [Releases](https://github.com/ofershap/dibbur/releases/latest): `aarch64` for Apple Silicon (M1/M2/M3/M4), `x64` for Intel.
2. Open the DMG and drag Dibbur into Applications.
3. First launch: right-click Dibbur > Open > Open. The app is unsigned for now, so macOS asks once.
4. Allow Microphone and Accessibility when macOS asks.
5. In Settings > Models, download the recommended **Ivrit Turbo** model (one-time ~1.6 GB).
6. Pick your keyboard shortcut in Settings, press it, and speak Hebrew.

## FAQ

<details>
<summary>Is Dibbur really offline?</summary>

Yes. Transcription runs locally with a Whisper engine on your machine, with no account and no cloud. The only network calls are the one-time model download and the optional text-cleanup step, which is off by default.

</details>

<details>
<summary>Which Macs are supported?</summary>

Both Apple Silicon and Intel. Apple Silicon is strongly recommended - the large-v3-turbo model transcribes in near real time there; on Intel it works but is noticeably slower.

</details>

<details>
<summary>Can it transcribe English too?</summary>

Yes. The bundled Ivrit Turbo model is Hebrew-first but handles mixed Hebrew-English speech. You can also switch to any of the general Whisper and Parakeet models built into the app.

</details>

<details>
<summary>Why is the app unsigned?</summary>

Code signing needs a paid Apple Developer account, and Dibbur is a zero-budget project. macOS Gatekeeper lets you run it anyway: right-click the app and choose Open once. Notarized builds are on the roadmap.

</details>

<details>
<summary>What about Arabic?</summary>

On the roadmap. The open models for spoken Arabic dialects are still weak, so this needs real testing before it ships.

</details>

## Roadmap

- v0.1 - Hebrew-first Handy fork: ivrit-ai model built in, Hebrew-aware cleanup prompt, Dibbur branding. (Current release.)
- v0.2 - Hebrew UI translation, floating on-screen dictation button, notarized builds.
- Later - Arabic support, auto-start on speech.

## Building

Every push runs the test suite. macOS installer builds are triggered manually with the **Unsigned Mac Build** workflow (Actions tab), which produces the Apple Silicon and Intel DMGs. See [BUILD.md](BUILD.md) for local development.

## Contributing

Bug reports (especially Hebrew transcription issues), feature requests, and PRs are welcome. Open an issue first for larger changes.

## Credit

Nearly all of the code, and all of the hard problems (shortcuts, recording, VAD, paste, model engine), come from [Handy](https://github.com/cjpais/Handy) by [C.J. Pais](https://github.com/cjpais). The Hebrew speech model is by [ivrit-ai](https://www.ivrit.ai/) (Apache-2.0).

## Author

[![Made by ofershap](https://gitshow.dev/api/card/ofershap)](https://gitshow.dev/ofershap)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/ofershap)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat&logo=github&logoColor=white)](https://github.com/ofershap)

## License

[MIT](LICENSE) &copy; [Ofer Shapira](https://github.com/ofershap), same as upstream Handy.
