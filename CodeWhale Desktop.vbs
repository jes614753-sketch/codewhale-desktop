Set WshShell = CreateObject("WScript.Shell")
WshShell.Environment("Process")("ELECTRON_RUN_AS_NODE") = ""
WshShell.CurrentDirectory = "D:\GitHub Learn\codewhale-desktop"
WshShell.Run """D:\GitHub Learn\codewhale-desktop\node_modules\electron\dist\electron.exe"" . --no-sandbox", 0, False
