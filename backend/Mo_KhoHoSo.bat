@echo off
chcp 65001 >nul
title Kho ho so tham muu - PV01
cd /d "%~dp0"

echo ============================================
echo   KHO HO SO THAM MUU - PV01
echo   Dang khoi dong may chu...
echo ============================================

where python >nul 2>nul
if %errorlevel% neq 0 (
    rem Tim kiem Python trong cac thu muc mac dinh tren Windows
    for /d %%d in ("%USERPROFILE%\AppData\Local\Programs\Python\Python*") do (
        if exist "%%d\python.exe" (
            set "PATH=%%d;%%d\Scripts;%PATH%"
            goto :PYTHON_FOUND
        )
    )
    for /d %%d in ("C:\Program Files\Python*") do (
        if exist "%%d\python.exe" (
            set "PATH=%%d;%%d\Scripts;%PATH%"
            goto :PYTHON_FOUND
        )
    )
    for /d %%d in ("C:\Program Files (x86)\Python*") do (
        if exist "%%d\python.exe" (
            set "PATH=%%d;%%d\Scripts;%PATH%"
            goto :PYTHON_FOUND
        )
    )
    
    echo [LOI] Khong tim thay Python. Vui long cai dat Python va tick vao o "Add Python to PATH".
    pause
    exit /b
)
:PYTHON_FOUND

rem Kiem tra neu thu muc venv cu khong tuong thich hoac loi
if not exist "venv\Scripts\activate.bat" goto :CREATE_VENV
venv\Scripts\python.exe -c "import sys" >nul 2>nul
if %errorlevel% neq 0 (
    echo [THONG BAO] Phat hien moi truong ao cu hoac loi. Dang xoa de tu dong tao lai...
    rd /s /q venv
    goto :CREATE_VENV
)

rem Kiem tra neu thieu thu vien trong moi truong ao
venv\Scripts\python.exe -c "import flask, pandas, openpyxl" >nul 2>nul
if %errorlevel% neq 0 goto :INSTALL_DEPS

goto :VENV_OK

:CREATE_VENV
echo Dang tao moi truong ao lan dau - co the mat 1-2 phut...
python -m venv venv
if %errorlevel% neq 0 (
    echo [LOI] Khong the khoi tao moi truong ao venv.
    pause
    exit /b
)

:INSTALL_DEPS
call venv\Scripts\activate.bat
echo Dang cai dat cac thu vien can thiet - Yeu cau ket noi Internet...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [LOI] Khong the cai dat cac thu vien. Vui long kiem tra ket noi mang.
    pause
    exit /b
)
goto :VENV_ACTIVE

:VENV_OK
call venv\Scripts\activate.bat

:VENV_ACTIVE
echo Dang khoi dong ung dung...
python app.py

pause
