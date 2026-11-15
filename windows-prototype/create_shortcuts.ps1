# Creates a Desktop shortcut and a Startup shortcut (so it starts with Windows)
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pyw = Join-Path $dir "venv\Scripts\pythonw.exe"
$script = Join-Path $dir "dictation.py"
$shell = New-Object -ComObject WScript.Shell
foreach ($folder in @([Environment]::GetFolderPath("Desktop"), [Environment]::GetFolderPath("Startup"))) {
    $lnk = $shell.CreateShortcut((Join-Path $folder "Hebrew Dictation.lnk"))
    $lnk.TargetPath = $pyw
    $lnk.Arguments = "`"$script`""
    $lnk.WorkingDirectory = $dir
    $lnk.IconLocation = "$env:SystemRoot\System32\shell32.dll,138"
    $lnk.Description = "Hold Left Ctrl and talk"
    $lnk.Save()
    Write-Output "Created: $folder\Hebrew Dictation.lnk"
}
