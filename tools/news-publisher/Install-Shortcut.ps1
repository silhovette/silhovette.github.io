$ErrorActionPreference = 'Stop'
$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$shortcutPath = Join-Path $desktop 'Homepage News Publisher.lnk'
$launcher = Join-Path $PSScriptRoot 'News-Publisher.ps1'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shortcut.Arguments = "-NoLogo -NoProfile -STA -ExecutionPolicy RemoteSigned -WindowStyle Hidden -File `"$launcher`""
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = 'Publish a news item to the homepage'
$shortcut.Save()
Get-Item -LiteralPath $shortcutPath
