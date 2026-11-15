# Contributing to Dibbur

Bug reports, documentation, Hebrew and Arabic improvements, and code contributions are welcome. Dibbur is a fork of [Handy](https://github.com/cjpais/Handy); submit Dibbur changes here, not to the upstream project's issue tracker.

## Start here

- Search [Dibbur issues](https://github.com/ofershap/dibbur/issues) and [pull requests](https://github.com/ofershap/dibbur/pulls), including closed ones.
- [Open an issue](https://github.com/ofershap/dibbur/issues/new/choose) for a bug, question, feature idea or proposed platform port. A blank issue is available when no template fits.
- For a larger change, explain the approach first so we can agree on scope. Small fixes can go straight to a pull request.
- Report vulnerabilities privately using [SECURITY.md](SECURITY.md), not in a public issue.

## Windows and Linux contributions

Published Dibbur installers currently target macOS. Windows and Linux work is welcome, but inherited Handy platform code is not proof that Dibbur builds or works on those systems. A port should state exactly what was built and tested, and what still needs review.

For a Windows contribution, include the Windows version and architecture, Rust/Bun/toolchain versions, build commands and output, and results for microphone capture, Hebrew/Arabic model loading, shortcuts, paste into another app, packaging and updating. Mark anything untested explicitly. Never include credentials, signing certificates, personal recordings or private transcripts in a patch, ZIP or log. A public pull request from a fork is the preferred review route.

## Build and test

1. Fork **ofershap/dibbur** and clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/dibbur.git
   cd dibbur
   git switch -c fix/your-change
   ```

2. Follow [BUILD.md](BUILD.md) for prerequisites, the VAD resource and local build commands.
3. Keep the change focused. Do not include downloaded speech models, generated installers, tokens or unrelated lockfile churn.
4. Run the checks that apply to your change:

   ```bash
   bun run build
   bun run lint
   bun run test:keyboard
   python3 scripts/check-repo-readiness.py
   # Rust changes, with the platform prerequisites installed:
   cd src-tauri
   cargo fmt --check
   cargo test
   ```

   Report the command and result. If a check cannot run, say why instead of calling it passed. A frontend preview does not test native recording, permissions, shortcuts or paste.

5. Push your branch and [open a pull request against ofershap/dibbur](https://github.com/ofershap/dibbur/compare). Explain the problem, changes, tests, platform and any remaining limits. Use the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

## AI-assisted changes

AI-assisted contributions are welcome. Mention the tools used and what you personally checked. Generated code needs the same review and test evidence as other code; never include keys, private conversations or personal recordings.

## Project layout

- `src/`: React/TypeScript interface.
- `src-tauri/src/`: Rust application, audio, models, shortcuts and commands.
- `src/i18n/locales/`: UI translations; see [the translation guide](CONTRIBUTING_TRANSLATIONS.md).
- `transcripts-mcp/`: optional read-only access to the user's chosen transcript archive.
- `landing/`: installation website.

## Review and releases

A PR is a proposal, not a promise of merge or release. Tests and a review of privacy, platform behavior and regression risks come before acceptance. Release builds, signing and publication are maintainer tasks; contributors do not need maintainer secrets. The disabled upstream Main Branch Build workflow is intentional and must not be re-enabled as a generic cleanup.

Contributions are licensed under the repository's [MIT license](LICENSE). Keep existing upstream copyright and attribution notices.
