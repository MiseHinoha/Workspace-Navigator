# Workspace Navigator 浏览器插件

快速将当前网页添加到 Workspace Navigator 导航页。

## 📦 版本说明

本项目提供两个版本的浏览器插件：

| 版本 | 目录 | 适用浏览器 | Manifest 版本 |
|------|------|-----------|--------------|
| **Zen/Firefox** | `browser-extension-zen/` | Zen Browser, Firefox | V2 |
| **Chrome** | `browser-extension-chrome/` | Chrome, Edge, Brave | V3 |

## 🚀 安装方法

### Zen/Firefox 版本

1. **临时加载（开发测试）**
   - 打开 `about:addons`
   - 点击齿轮图标 → 启用开发者模式
   - 点击「临时载入附加组件」
   - 选择 `browser-extension-zen/manifest.json`

2. **打包安装**
   - 下载 `workspace-navigator-zen-v*.zip`
   - 重命名为 `.xpi` 文件
   - 拖放到 `about:addons` 页面

### Chrome/Edge 版本

1. **开发者模式加载**
   - 打开 `chrome://extensions/`
   - 开启右上角「开发者模式」
   - 点击「加载已解压的扩展程序」
   - 选择 `browser-extension-chrome/` 文件夹

2. **打包安装**
   - 下载 `workspace-navigator-chrome-v*.zip`
   - 解压到任意文件夹
   - 在 `chrome://extensions/` 中选择「加载已解压的扩展程序」

## 📋 功能特性

- ⚡ **一键添加** - 点击图标即可快速保存当前页面
- 🏷️ **智能标签** - 根据网站自动推荐标签
- 📁 **工作空间** - 直接保存到指定工作空间
- 📌 **快速固定** - 同时固定为卡片
- ⭐ **常用书签** - 添加到常用书签栏
- ⌨️ **快捷键** - `Ctrl+Shift+S` 快速打开

## 🛠️ 开发

### 目录结构

```
browser-extension-zen/       # Zen/Firefox 版本
├── manifest.json             # Manifest V2 配置
├── background.js             # 后台脚本
├── content.js                # 内容脚本
├── popup.html/css/js         # 弹出窗口
├── options.html/js           # 设置页面
└── icons/                    # 图标

browser-extension-chrome/    # Chrome 版本
├── manifest.json             # Manifest V3 配置
├── background.js             # Service Worker
├── content.js                # 内容脚本
├── popup.html/css/js         # 弹出窗口
├── options.html/js           # 设置页面
└── icons/                    # 图标
```

### 打包发布

```bash
cd browser-extensions
python package.py
```

生成的文件在 `dist/` 目录：
- `workspace-navigator-zen-v1.0.0-YYYYMMDD.zip`
- `workspace-navigator-chrome-v1.0.0-YYYYMMDD.zip`

## 🔧 主要区别

### Manifest 版本差异

| 特性 | Zen/Firefox (V2) | Chrome (V3) |
|------|------------------|-------------|
| 后台脚本 | `background.scripts` | `background.service_worker` |
| 浏览器 API | `browser.*` | `chrome.*` |
| 扩展 ID | `browser_specific_settings.gecko.id` | 不需要 |
| 存储 API | 需要显式 ID（临时模式） | 自动分配 |

### 代码差异

**Zen/Firefox (V2):**
```javascript
// background.js
browser.runtime.onMessage.addListener(...)
browser.tabs.query(...)
browser.storage.sync.get(...)
```

**Chrome (V3):**
```javascript
// background.js
chrome.runtime.onMessage.addListener(...)
chrome.tabs.query(...)
chrome.storage.sync.get(...)
```

## 📄 许可证

MIT License - 与 Workspace Navigator 主项目一致
