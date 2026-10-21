//! Remembers which app was frontmost when dictation started, so the paste can
//! be delivered back to it even if interacting with Dibbur in the meantime
//! (for example clicking the overlay's Done button) made Dibbur the active
//! app. Without this, the synthesized Cmd+V lands nowhere useful because the
//! user's text field no longer has key focus.
//!
//! macOS only: on other platforms the capture/restore calls are no-ops (the
//! overlay there is configured to never take activation, and the legacy paste
//! path has no notion of a previous app). Only the pid is stored, so the
//! snapshot is a plain value with no AppKit threading constraints.

#[cfg(target_os = "macos")]
use std::sync::Mutex;

#[cfg(target_os = "macos")]
static FRONTMOST_PID: Mutex<Option<i32>> = Mutex::new(None);

/// Snapshot the currently frontmost app, unless it is Dibbur itself (starting
/// dictation from our own window keeps the previous snapshot, which points at
/// the app the user was actually working in).
#[cfg(target_os = "macos")]
pub fn capture_frontmost() {
    use objc2_app_kit::NSWorkspace;

    let workspace = NSWorkspace::sharedWorkspace();
    if let Some(app) = workspace.frontmostApplication() {
        let pid = app.processIdentifier();
        if pid == std::process::id() as i32 {
            return;
        }
        if let Ok(mut slot) = FRONTMOST_PID.lock() {
            *slot = Some(pid);
        }
    }
}

/// Re-activate the app captured at dictation start. Returns true only when a
/// switch actually happened (the captured app was not already frontmost), so
/// the caller can wait a beat for the activation to settle before injecting
/// the paste chord. Consumes the snapshot.
#[cfg(target_os = "macos")]
pub fn restore_frontmost() -> bool {
    use objc2_app_kit::{NSApplicationActivationOptions, NSRunningApplication, NSWorkspace};

    let pid = match FRONTMOST_PID.lock() {
        Ok(mut slot) => slot.take(),
        Err(_) => None,
    };
    let Some(pid) = pid else {
        return false;
    };
    // Nothing to fix when the captured app is still frontmost (the common
    // case: the overlay panel never took activation).
    if let Some(current) = NSWorkspace::sharedWorkspace().frontmostApplication() {
        if current.processIdentifier() == pid {
            return false;
        }
    }
    let Some(app) = NSRunningApplication::runningApplicationWithProcessIdentifier(pid) else {
        return false;
    };
    if app.isTerminated() {
        return false;
    }
    let activated = unsafe {
        app.activateWithOptions(NSApplicationActivationOptions::ActivateIgnoringOtherApps)
    };
    if activated {
        log::info!("[focus] restored frontmost app before paste (pid {pid})");
    } else {
        log::warn!("[focus] failed to re-activate captured app before paste");
    }
    activated
}

#[cfg(not(target_os = "macos"))]
pub fn capture_frontmost() {}

#[cfg(not(target_os = "macos"))]
pub fn restore_frontmost() -> bool {
    false
}
