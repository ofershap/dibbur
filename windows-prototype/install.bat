@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo Hebrew Dictation - experimental Windows prototype
where python >nul 2>nul
if errorlevel 1 goto :no_python
python -c "import sys; assert sys.version_info[:2] == (3, 12) and sys.maxsize > 2**32" >nul 2>nul
if errorlevel 1 (
    echo Use 64-bit Python 3.12 from https://www.python.org/downloads/ with Add to PATH.
    pause
    exit /b 1
)
if not exist "venv\Scripts\python.exe" (
    python -m venv venv
    if errorlevel 1 goto :failed
)
set "PY=%~dp0venv\Scripts\python.exe"
"%PY%" -m pip install --upgrade pip
if errorlevel 1 goto :failed
"%PY%" -m pip install -r "%~dp0requirements.txt"
if errorlevel 1 goto :failed
where nvidia-smi >nul 2>nul
if not errorlevel 1 (
    echo Installing optional NVIDIA libraries. CPU fallback remains available in auto mode.
    "%PY%" -m pip install nvidia-cublas-cu12 "nvidia-cudnn-cu12==9.*"
    if errorlevel 1 goto :failed
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create_shortcuts.ps1"
if errorlevel 1 goto :failed
echo Desktop shortcut created. Start with Windows is optional.
choice /C YN /N /M "Also start automatically when you sign in? [Y/N] "
if errorlevel 2 goto :launch
if errorlevel 1 (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create_shortcuts.ps1" -Startup
    if errorlevel 1 goto :failed
)
:launch
echo First start downloads speech models. Internet is needed for installation and first use.
start "" "%~dp0venv\Scripts\pythonw.exe" "%~dp0dictation.py"
echo Hold LEFT CTRL + LEFT SHIFT after the ready indicator appears.
pause
exit /b 0
:no_python
echo Install 64-bit Python 3.12 from https://www.python.org/downloads/ and select Add to PATH.
pause
exit /b 1
:failed
echo Setup did not finish. Read the error above; the app has not been started.
pause
exit /b 1
