# Contributor readiness

This is the contribution-readiness gate for Dibbur. A passing app build is not enough to call a public fork ready.

## Decisions and reasons

1. We keep contribution routes on Dibbur because contributors should not be sent to Handy by inherited templates. Rejected: leaving upstream issue URLs in active intake.
2. We keep a blank issue option and a feature/platform template because not every contribution is a bug. Rejected: a bug-only chooser with feature requests routed elsewhere.
3. We welcome AI-assisted patches with disclosure and test evidence because the same review bar can apply to all contributions. Rejected: inherited feature-freeze/rejection boilerplate and promises of automatic acceptance.
4. We preserve the owner-disabled upstream Main Branch Build workflow because enabling it is not a documentation fix. Rejected: treating all disabled checks as accidental.
5. We distinguish a proposed Windows/Linux port from a tested release because inherited cross-platform code and a contributor's report do not establish Dibbur support. Rejected: announcing a port before build and device testing.
6. We verify private vulnerability reporting before linking it because a security policy needs a working private route. Rejected: a security file with an untested contact path.
7. We check public settings and actual entry pages because file presence cannot detect disabled Issues or a chooser that rejects non-bugs. Rejected: checking only README, tests and releases.
8. We compare inherited files with upstream and the project's own product claims because upstream rules and old version text can be correct there but wrong here. Rejected: blind global rebranding of third-party credits.

## Required gate

Run from the repository root:

```bash
python3 scripts/check-repo-readiness.py
python3 scripts/check-repo-readiness.py --live
```

The live pass uses the GitHub API. An optional `GH_TOKEN` environment variable can avoid unauthenticated rate limits; never put its value in a command, issue or commit. An unavailable check is a failed gate, not a pass. The checker never changes settings or dispatches builds.

Then inspect the actual GitHub pages visually:

- Issues is visible and `/issues/new/choose` offers a bug route, a feature/platform route and a blank route.
- Both templates point to Dibbur, and the PR guide targets Dibbur's base branch.
- Private vulnerability reporting offers a private report form. Do not submit a test report.
- README, About/topics, release downloads and contributor guidance agree on the supported platforms and local/optional-network behavior.
- Hero, collapsed FAQ, similar-project credits, license, CONTRIBUTING, SECURITY, llms.txt and the shared author/footer format are present and readable.
- Preserve explicit owner workflow decisions; do not dispatch signing/release workflows or publish an artifact as part of this gate.

For a real contribution, inspect its code and run relevant tests before claiming acceptance or merging. For a native app, browser screenshots cannot verify microphone capture, permissions, global shortcuts or paste into other applications.

## Why the November 2026 audit was needed

The repository retained Handy's contribution freeze, upstream support/PR destinations and a chooser without a blank issue option. Issues had also been disabled and were enabled before this documentation repair. Those are verified barriers; neither a setting nor this audit proves how many people tried to contribute or why any specific person left. GitHub's current setting does not identify who originally disabled it or when.

No application code, signing key, release, workflow state or contributor patch is changed by this documentation repair.
