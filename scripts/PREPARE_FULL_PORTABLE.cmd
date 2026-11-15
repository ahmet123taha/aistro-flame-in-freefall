@echo off
setlocal
where pwsh >nul 2>nul
if errorlevel 1 (
  echo Preparation requires PowerShell 7. See START_HERE.txt.
  pause
  exit /b 1
)
python --version >nul 2>nul
if errorlevel 1 (
  echo Preparation requires Python 3. See START_HERE.txt.
  pause
  exit /b 1
)
pwsh -NoProfile -File "%~dp0setup\download-dataset.ps1" -DestinationDirectory "%~dp0." -ManifestPath "%~dp0setup\dataset-release.json"
if errorlevel 1 (
  echo Preparation failed. Read the error above. The application was not started.
  pause
  exit /b 1
)
echo Application and dataset are ready together. Open SpaceApps1.exe, then Settings to enter YOUR API key.
pause
