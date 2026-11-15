@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Hebrew Dictation - installer
echo ============================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo Python is not installed.
    echo Please install Python 3.12 from https://www.python.org/downloads/
    echo IMPORTANT: tick "Add python.exe to PATH" during install, then run this file again.
    pause
    exit /b 1
)

echo [1/4] Creating environment...
if not exist venv python -m venv venv
venv\Scripts\python.exe -m pip install --upgrade pip -q

echo [2/4] Installing speech libraries (a few minutes)...
venv\Scripts\python.exe -m pip install faster-whisper sounddevice numpy pynput pyperclip pystray pillow -q

where nvidia-smi >nul 2>nul
if not errorlevel 1 (
    echo       NVIDIA graphics card found - installing GPU support for speed...
    venv\Scripts\python.exe -m pip install nvidia-cublas-cu12 "nvidia-cudnn-cu12==9.*" -q
) else (
    echo       No NVIDIA card found - will run on the processor - slower.
)

echo [3/4] Creating Desktop and Startup shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create_shortcuts.ps1"

echo [4/4] Starting the app. First start downloads the Hebrew model (about 1.6 GB)...
start "" "%~dp0venv\Scripts\pythonw.exe" "%~dp0dictation.py"

echo.
echo Done! When the "ready" box appears at the bottom of the screen:
echo Hold LEFT CTRL + LEFT SHIFT, talk, and let go.
pause
