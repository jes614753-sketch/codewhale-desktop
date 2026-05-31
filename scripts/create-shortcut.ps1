$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath 'CodeWhale Desktop.lnk'
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = 'wscript.exe'
$Shortcut.Arguments = '"D:\GitHub Learn\codewhale-desktop\CodeWhale Desktop.vbs"'
$Shortcut.WorkingDirectory = 'D:\GitHub Learn\codewhale-desktop'
$Shortcut.IconLocation = 'D:\GitHub Learn\codewhale-desktop\resources\icon.ico'
$Shortcut.Description = 'CodeWhale Desktop - AI Coding Agent'
$Shortcut.Save()
Write-Host "Shortcut created at: $ShortcutPath"
