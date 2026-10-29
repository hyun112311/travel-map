@echo off
chcp 65001 > nul
title My Travel Log - 모바일 서버 실행기

echo ========================================================
echo   📱 My Travel Log - 스마트폰 연동 모바일 서버 시작 중...
echo ========================================================
echo.

python "%~dp0mobile_server.py"

if errorlevel 1 (
    echo.
    echo [알림] Python이 감지되지 않았습니다. 기본 브라우저로 엽니다.
    start "" "%~dp0index.html"
    pause
)
