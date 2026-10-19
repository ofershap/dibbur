//! Optional plain-text transcript archive.
//!
//! When `transcript_archive_enabled` is on, every completed transcription is
//! appended to a daily Markdown file (`YYYY-MM-DD.md`, one `## HH:MM:SS`
//! section per entry) in a user-chosen folder. Everything stays on local
//! disk: no account, no sync of our own. Users who want the archive on
//! another device point the folder at an iCloud Drive / Google Drive sync
//! directory. Off by default.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

use anyhow::Result;
use chrono::Local;
use tauri::{AppHandle, Manager};

use super::history::HistoryEntry;
use crate::settings::get_settings;

const DEFAULT_DIR_NAME: &str = "Dibbur Transcripts";

/// The folder daily archive files are written to: the user-chosen directory,
/// or `~/Documents/Dibbur Transcripts` when none is set.
pub fn archive_dir(app: &AppHandle) -> Result<PathBuf> {
    let settings = get_settings(app);
    if let Some(dir) = settings.transcript_archive_dir {
        if !dir.is_empty() {
            return Ok(PathBuf::from(dir));
        }
    }
    Ok(app.path().document_dir()?.join(DEFAULT_DIR_NAME))
}

/// Append one finished transcription to today's archive file. No-op when the
/// archive is disabled or the entry carries no text (failed transcriptions).
pub fn append_entry(app: &AppHandle, entry: &HistoryEntry) -> Result<()> {
    let settings = get_settings(app);
    if !settings.transcript_archive_enabled {
        return Ok(());
    }

    let text = entry
        .post_processed_text
        .clone()
        .unwrap_or_else(|| entry.transcription_text.clone());
    let text = text.trim();
    if text.is_empty() {
        return Ok(());
    }

    let dir = archive_dir(app)?;
    std::fs::create_dir_all(&dir)?;

    let now = Local::now();
    let path = dir.join(format!("{}.md", now.format("%Y-%m-%d")));
    let mut file = OpenOptions::new().create(true).append(true).open(&path)?;
    writeln!(file, "\n## {}\n\n{}\n", now.format("%H:%M:%S"), text)?;

    Ok(())
}
