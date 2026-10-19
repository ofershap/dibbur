# Dibbur (דיבור)

**Hebrew-first voice dictation for macOS. Press a shortcut, speak Hebrew, and your words appear in any app. Free, open source, and fully offline.**

Dibbur is a fork of [Handy](https://github.com/cjpais/Handy) (by [C.J. Pais](https://github.com/cjpais), MIT license) with one goal: make open-source dictation actually good in Hebrew.

## Why Dibbur?

- **Hebrew accuracy first**: ships with the [ivrit-ai](https://huggingface.co/ivrit-ai) Whisper large-v3-turbo model (Apache-2.0), the strongest open Hebrew speech model (~7% WER on WhatsApp messages per the [ivrit-ai leaderboard](https://huggingface.co/spaces/ivrit-ai/hebrew-transcription-leaderboard)) - better than the big commercial APIs on Hebrew.
- **Private**: transcription runs on your Mac. Your voice never leaves the computer.
- **Works everywhere**: hold a shortcut, talk, release - the text is pasted into whatever app you're in.
- **Optional AI cleanup**: a post-processing step removes filler words (אממ, כאילו...), fixes punctuation and keeps your language. Works with a free API key (Gemini, Groq), a local model via Ollama, or Apple Intelligence.

## Install (macOS)

1. Download `Dibbur_*.dmg` from the [latest build](https://github.com/ofershap/dibbur/actions) or Releases.
2. Open the DMG and drag Dibbur to Applications.
3. The app is not notarized yet, so on first launch: right-click the app > Open > Open. (Or run `xattr -dr com.apple.quarantine /Applications/Dibbur.app`.)
4. Grant microphone and accessibility permissions when prompted.
5. In the model list, download **Ivrit Turbo (Hebrew)** - it's the recommended model.
6. Set your shortcut in Settings and start dictating.

## Roadmap

- v0.1: Hebrew-first Handy fork - ivrit-ai model built in, Hebrew-aware cleanup prompt, Dibbur branding. (This release.)
- v0.2: floating on-screen dictation button; auto-start on speech; Hebrew UI translation; notarized builds.
- Later: Arabic support (the open models for spoken Arabic dialects are still weak - this needs real testing first).

## Building

See [BUILD.md](BUILD.md). Every push to `main` builds macOS (Apple Silicon + Intel), Linux and Windows artifacts via GitHub Actions.

## Credit and license

Dibbur is built on [Handy](https://github.com/cjpais/Handy) - nearly all of the code and all of the hard problems (shortcuts, recording, VAD, paste, model engine) are theirs. MIT license, same as upstream; see [LICENSE](LICENSE). Hebrew speech model by [ivrit-ai](https://www.ivrit.ai/) (Apache-2.0).
