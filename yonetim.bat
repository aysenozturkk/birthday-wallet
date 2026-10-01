@echo off
setlocal
cd /d "%~dp0"
set "PATH=%PATH%;%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd"
where node >nul 2>nul
if not errorlevel 1 (
  node local-admin.cjs
  goto :done
)
set "BIRTHDAY_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%BIRTHDAY_NODE%" (
  "%BIRTHDAY_NODE%" local-admin.cjs
  goto :done
)
echo Node.js bulunamadi. Node.js kurup bu dosyayi yeniden acin.
:done
pause
