@echo off
if exist "%~dp0..\.venv\Scripts\python.exe" (
  "%~dp0..\.venv\Scripts\python.exe" "%~dp0secure_input.py" %*
) else (
  python "%~dp0secure_input.py" %*
)
