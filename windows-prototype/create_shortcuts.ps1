param([switch]$Startup)
$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pyw = Join-Path $dir "venv\Scripts\pythonw.exe"
$script = Join-Path $dir "dictation.py"
if (!(Test-Path $pyw) -or !(Test-Path $script)) { throw "Install the Python environment first." }
$shell = New-Object -ComObject WScript.Shell
$folders = @([Environment]::GetFolderPath("Desktop"))
if ($Startup) { $folders += [Environment]::GetFolderPath("Startup") }
foreach ($folder in $folders) {
    $lnk = $shell.CreateShortcut((Join-Path $folder "Hebrew Dictation.lnk"))
    $lnk.TargetPath = $pyw
    $lnk.Arguments = "`"$script`""
    $lnk.WorkingDirectory = $dir
    $lnk.IconLocation = "$env:SystemRoot\System32\shell32.dll,138"
    $lnk.Description = "Hold Left Ctrl + Left Shift and talk"
    $lnk.Save()
    Write-Output "Created: $folder\Hebrew Dictation.lnk"
}
