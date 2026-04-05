@echo off
chcp 65001 >nul
title Workspace Navigator - Zen 安装助手
echo.
echo ============================================
echo   Workspace Navigator Zen 安装助手
echo ============================================
echo.
echo 安装方法（无需发布到商店）：
echo.
echo 方法1：临时加载（推荐，最简单）
echo --------------------------------------------
echo.
echo 1. 正在打开 Zen 调试页面...
start zen.exe --new-tab "about:debugging#/runtime/this-firefox"
echo.
echo 2. 请按以下步骤操作：
echo    a) 点击【临时载入附加组件...】
echo    b) 选择此文件：
echo.
echo       %~dp0..\browser-extension-zen\manifest.json
echo.
echo    c) 扩展会立即加载！
echo.
echo    注意：重启浏览器后需要重新加载
echo.
echo ============================================
echo.
echo 方法2：允许未签名扩展（永久安装）
echo --------------------------------------------
echo.
echo 1. 在地址栏输入 about:config 并回车
echo 2. 搜索 xpinstall.signatures.required
echo 3. 双击将其设为 false
echo 4. 重启浏览器后可直接安装 .xpi 文件
echo.
echo ============================================
echo.
echo 按任意键打开扩展文件夹...
pause >nul
explorer "%~dp0..\browser-extension-zen\"
echo.
echo 完成！请选择上述任一方法安装。
echo.
pause
