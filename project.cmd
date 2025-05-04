@echo off
setlocal

set "DISCRIMINATOR=%1"
set "SCRIPT_DIR=%~dp0"

if "%DISCRIMINATOR%"=="create" (
  if exist "%SCRIPT_DIR%NodeJS\create.js" (
    call node "%SCRIPT_DIR%NodeJS\create.js" %*
    set "code=%ERRORLEVEL%"

    if "%code%"=="0" (
      echo Template created! Happy hacking!
    ) else (
      if "%code%"=="" (
        REM The script did not call process.exit()
        echo Template created! Happy hacking!
      ) else (
        echo Error: The script exited with code %code%.
        echo Please check the script for errors.
      )
    )

    exit /b %code%
  ) else (
    echo Error: The file '%SCRIPT_DIR%NodeJS\create.js' does not exist.
    exit /b 1
  )
)

if "%DISCRIMINATOR%"=="help" (
  echo Available commands:
  echo   create [options] - Create a new project
  echo   help              - Show this help message
  exit /b 0
)

echo Unknown command: %DISCRIMINATOR%
echo Available commands: [create, help]
exit /b 1
REM End of script