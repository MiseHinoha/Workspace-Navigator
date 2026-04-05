# 浏览器扩展本地安装指南

本指南介绍如何在不发布到商店的情况下，直接安装 Workspace Navigator 浏览器扩展。

## 📦 扩展文件

```
browser-extensions/dist/
├── workspace-navigator-zen-v1.0.0.xpi      # Zen/Firefox 版本
└── workspace-navigator-chrome-v1.0.0.crx   # Chrome/Edge 版本
```

---

## 🔷 Zen/Firefox 安装方法

### 方法一：直接安装 .xpi 文件（推荐）

1. 打开 Zen 浏览器
2. 按 `Ctrl+Shift+A` 或地址栏输入 `about:addons`
3. 点击右上角的齿轮图标 → **从文件安装附加组件...**
4. 选择 `workspace-navigator-zen-v1.0.0.xpi` 文件
5. 点击「添加」确认安装

### 方法二：开发者模式加载

1. 解压 `workspace-navigator-zen-v1.0.0.xpi`（本质是 ZIP 文件）
2. 打开 `about:addons`
3. 点击齿轮图标 → 启用「开发者模式」
4. 点击「临时载入附加组件」
5. 选择解压后的 `manifest.json` 文件

---

## 🔶 Chrome/Edge 安装方法

### 方法一：开发者模式加载（推荐）

Chrome 对第三方 .crx 文件有限制，推荐直接加载解压版本：

1. 解压 `browser-extension-chrome/` 文件夹
2. 打开 Chrome，地址栏输入 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `browser-extension-chrome/` 文件夹

### 方法二：安装 .crx 文件

**注意**：Chrome 新版本对未签名扩展有限制，此方法可能需要在 Chrome 策略中启用。

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 将 `.crx` 文件拖放到扩展页面
4. 如果出现"程序包无效"错误，请使用方法一

### 方法三：策略安装（企业环境）

对于需要在多台电脑安装的情况，可以通过组策略部署：

1. 将 `.crx` 文件放在固定位置（如 `C:\Extensions\`）
2. 打开注册表编辑器 `regedit`
3. 定位到 `HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallSources`
4. 添加允许的来源路径

---

## ⚙️ 首次配置

安装完成后，需要配置你的 Workspace Navigator 服务器：

1. 点击浏览器工具栏的扩展图标
2. 点击「打开设置」
3. 输入你的导航页地址（如 `http://localhost:3000`）
4. 使用账号密码登录，或手动粘贴 Token

---

## 🔧 重新打包

如果需要修改代码后重新打包：

### Zen/Firefox

```bash
cd browser-extension-zen
web-ext build --artifacts-dir=../browser-extensions/dist
# 重命名 .zip 为 .xpi
```

或使用：

```bash
cd browser-extensions
python package.py
```

### Chrome

```bash
cd browser-extensions
python build-chrome.py
```

---

## ❓ 常见问题

### Q: Chrome 提示"程序包无效"？
A: Chrome 新版本限制了第三方 .crx 安装，请使用「方法一：加载已解压的扩展程序」

### Q: Zen 提示扩展已损坏？
A: 这是正常的，因为扩展未签名。点击「修复」即可继续使用。

### Q: 如何更新扩展？
A: 
- Zen：直接安装新版本的 .xpi，会自动覆盖
- Chrome：删除旧扩展，重新加载新版本

### Q: 如何导出我的配置？
A: 扩展配置存储在浏览器的同步存储中，登录同一账号会自动同步。

---

## 📄 文件说明

| 文件 | 说明 |
|------|------|
| `.xpi` | Firefox/Zen 扩展包格式（本质为 ZIP） |
| `.crx` | Chrome 扩展包格式（签名的 ZIP） |
| `.pem` | Chrome 扩展签名密钥（重新打包时需要） |

---

## 🔒 安全提示

- 这些扩展包仅供本地使用，不要分享给他人
- `.pem` 密钥文件请妥善保管，丢失后无法更新同一扩展
- 生产环境建议通过官方商店安装以获得自动更新
