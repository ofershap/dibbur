---
title: "דיבור | Dibbur - הקלדה קולית בעברית ובערבית ל-Mac"
description: "Free open-source Hebrew and Arabic dictation for macOS - אפליקציה חינמית ופתוחה להקלדה קולית, הכל מקומי ופרטי"
lang: he
---

# דיבור | Dibbur

אפליקציית Mac חינמית בקוד פתוח להקלדה קולית בעברית ובערבית.
Free, open-source Hebrew and Arabic dictation app for macOS - press Option+Space, speak, and the text is typed where your cursor is. Everything runs locally; no cloud, no account.

- הורדה / Download: https://github.com/ofershap/dibbur/releases/latest (Apple Silicon: `*_aarch64.dmg`, Intel: `*_x64.dmg`)
- קוד מקור / Source: https://github.com/ofershap/dibbur
- לסוכנים / For agents: https://dibbur.pages.dev/llms.txt and https://dibbur.pages.dev/.well-known/ard.json

## למה דיבור

- **פרטי לחלוטין** - ההקלטה והתמלול נשארים על המכונה. העיבוד מקומי (Whisper), עובד גם בלי אינטרנט.
- **עברית וערבית מהקופסה** - מודל עברית של ivrit-ai, תמיכה מלאה בערבית, ועוד שפות דרך Whisper.
- **חינם וקוד פתוח** - רישיון MIT, מבוסס על Handy. בלי מנוי, בלי חשבון.

## התקנה בקצרה

1. הורידו את ה-DMG המתאים (תפריט התפוח ← אודות Mac זה: שבב M1-M4 = Apple Silicon, מעבד Intel = גרסת Intel).
2. גררו ל-Applications, פתחו בלחיצה ימנית ← פתח (האפליקציה לא חתומה ב-Apple).
3. אשרו שתי הרשאות: נגישות (Accessibility) ומיקרופון.
4. Option+Space ומתחילים לדבר.

אחרי עדכון גרסה: צאו מהאפליקציה (Quit) לפני ההחלפה; אם ההקלדה מפסיקה - הסירו את דיבור מרשימת הנגישות והוסיפו מחדש.

## Windows experimental source prototype

Separate Python prototype, not the Mac desktop app or a standalone EXE/MSI. Requires Windows and 64-bit Python 3.12 with PATH enabled. Extract all files, run install.bat, wait for ready, hold Left Ctrl + Left Shift to dictate. First installation/model downloads need internet and several GB. Native Windows CI imports and 24 mocked tests passed; live microphone, accuracy, GPU, tray, startup and real-app paste remain unverified.

- Download source ZIP: https://github.com/ofershap/dibbur/releases/download/windows-prototype-v0.1.0/Dibbur-Windows-prototype-v0.1.0.zip
- Source and setup/privacy/uninstall guide: https://github.com/ofershap/dibbur/tree/main/windows-prototype
- Release and checksum: https://github.com/ofershap/dibbur/releases/tag/windows-prototype-v0.1.0
