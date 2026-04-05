@echo off
chcp 65001 >nul
title Workspace Navigator - Chrome 安装助手
echo.
echo ============================================
echo   Workspace Navigator Chrome 安装助手
echo ============================================
echo.
echo 安装方法（无需签名验证）：
echo.
echo 1. 正在打开 Chrome 扩展管理页面...
echo.
start chrome.exe --new-tab "chrome://extensions/"
echo.
echo 2. 请按以下步骤操作：
echo    a) 开启右上角的【开发者模式】
echo    b) 点击【加载已解压的扩展程序】
echo    c) 选择此文件夹：
echo.
echo       %~dp0..\browser-extension-chrome\
echo.
echo    d) 扩展会自动加载，无需签名！
echo.
echo ============================================
echo.
echo 按任意键打开扩展文件夹...
pause >nul
explorer "%~dp0..\browser-extension-chrome\"
echo.
echo 完成！请按照上述步骤在 Chrome 中操作。
echo.
pause
