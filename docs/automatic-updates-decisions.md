# Automatic update decisions

## Debate

Personas: daily dictation user, privacy advocate, security reviewer, maintainer, accessibility reviewer, release engineer, reliability skeptic, and bandwidth-conscious user.

Round 1: the daily user wants updates without remembering to check; privacy and bandwidth reviewers reject a second telemetry service. The maintainer chooses the existing signed GitHub update endpoint.
Round 2: the release engineer proposes immediate install/relaunch; the user and reliability skeptic reject losing an active recording, transcription or unsaved work. They choose automatic download with explicit install/restart.
Round 3: the security reviewer rejects a frontend-only microphone check because a shortcut can race it. The maintainer chooses a reservation on the serial dictation coordinator.
Round 4: the bandwidth reviewer rejects frequent polling and repeated downloads. The group chooses startup plus six-hour checks, retaining one prepared update and closing stale resources.
Round 5: accessibility wants a clear restart action instead of an unexplained update dot. The privacy reviewer requires the existing opt-out and administrator lock to remain effective. Portable packages keep the manual installer flow.
Round 6: the release engineer wants immediate publication after a web build; the skeptic rejects that as native proof. The group requires lifecycle tests, real rendered UI review, native state tests, and Mac build qualification before release.

## Decision tree and simulations

- Transport: new service / custom unsigned archive / existing signed updater (chosen).
  - Existing updater: download-and-install in one step / separate signed download and explicit installation (chosen).
    - Restart: forced immediately / timer / explicit user action (chosen).
      - Safety: UI recording flag / backend coordinator reservation (chosen).
        - Busy: interrupt / queue an unexpected future restart / keep package and offer retry (chosen).
- Schedule: launch only / minutes / six hours (chosen) / daily.
  - Concurrency: overlapping checks / one check and one pending update (chosen).
    - Disable during check: publish stale result / invalidate epoch and release resource (chosen).
      - Re-enable while old check runs: wait six hours / check when stale work finishes (chosen).
- Controls: silently override preference / retain preference and system lock (chosen).
  - Portable: install through normal path / preserve manual matching installer (chosen).
- Failures: crash / silent stall / visible retry with resource cleanup (chosen).
  - Installation error: leave dictation locked / unlock and fetch fresh package on retry (chosen).
- Rollout: web build proves everything / test pure native lifecycle and qualify full Mac build (chosen).
  - Existing clients: pretend feature already installed / explain one initial manual update is needed (chosen).

Simulation: a dictation starting just before installation wins the coordinator queue, so installation is refused. An installation reservation arriving first blocks new dictation until install/relaunch or failure cleanup. A network failure does not start installation. Disabling updates during download discards the completion and releases its package. Re-enabling after a stale check starts a fresh check. Portable users see an installer link, not an in-place installation. A long-lived tray app receives later checks without reopening its window. Six hours limits request frequency without requiring daily restarts. Existing 1.0.10 users need one update to obtain this behavior.

## Decisions

1. Scope: We use the existing signed updater because changing release trust is unnecessary.
   Why: The application already has an update public key and signed Mac assets. Rejected: a new service or unsigned downloads.
2. User control: We download automatically but install and restart only on an explicit action because a surprise restart can lose work.
   Why: Automatic download removes the waiting step without claiming fully silent installation. Rejected: forced restarts or a hidden future restart queue.
3. Dictation safety: We reserve the idle coordinator before installing because frontend flags can race keyboard input.
   Why: Recording, processing and queued input prevent the reservation. Rejected: checking only the recording flag.
4. Busy behavior: We keep the downloaded update when dictation is busy because the user should not download it twice.
   Why: A visible finish-dictation action allows a deliberate retry. Rejected: interrupting speech.
5. Cadence: We check at startup and every six hours because the tray application can run for days.
   Why: Startup-only checks miss updates; minute polling adds needless requests. Rejected: a new background daemon.
6. Preferences: We retain opt-out and system lock because existing choices must keep working.
   Why: Disabling also invalidates pending work. Rejected: overriding or rewriting the user's saved preference.
7. Portability: We keep the portable installer flow because portable installations cannot safely assume an in-place updater.
   Why: Platform-specific installer selection already exists. Rejected: installing the wrong package.
8. Failures: We expose retry and release stale resources because a network or install failure must not wedge dictation.
   Why: Locks reopen on failure and stale async work cannot publish ready. Rejected: silent permanent failures.
9. UI: We retain the footer layout and add plain restart, busy and retry text because this is a behavior change, not a redesign.
   Why: All 26 locale files contain the new action labels; Hebrew, Arabic and English are also covered by rendered interaction tests.
10. Qualification: We distinguish frontend, lifecycle, native state and full Mac build evidence because each catches a different failure.
    Why: A successful browser build is not proof of an installable native application. Rejected: publishing unqualified assets.
11. Rollout: We disclose that old clients need one initial update because new behavior cannot run before its code is installed.
    Why: A manifest alone does not add background behavior to 1.0.10.
