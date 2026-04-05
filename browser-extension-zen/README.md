# Workspace Navigator 浏览器插件

快速将当前网页添加到 Workspace Navigator 导航页。

## 功能特性

- ⚡ **一键添加** - 点击图标即可快速保存当前页面
- 🏷️ **智能标签** - 根据网站自动推荐标签
- 📁 **工作空间** - 直接保存到指定工作空间
- 📌 **快速固定** - 同时固定为卡片
- ⭐ **常用书签** - 添加到常用书签栏
- 🎨 **简洁界面** - 美观易用的弹出窗口

## 安装方法

### 方法一：开发者模式加载（推荐测试使用）

1. **生成图标**（如果还没有）
   ```bash
   cd browser-extension
   python generate_icons.py
   ```
   或者手动准备 `icons/icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`

2. **打开 Zen 浏览器的扩展管理页面**
   - 地址栏输入：`about:addons`
   - 或点击菜单 → 扩展和主题

3. **启用开发者模式**
   - 点击右上角的齿轮图标
   - 勾选「启用开发者模式」

4. **加载临时扩展**
   - 点击「临时载入附加组件」
   - 选择 `browser-extension` 文件夹中的 `manifest.json`

5. **配置插件**
   - 点击插件图标 → 打开设置
   - 输入你的导航页地址（如 `http://localhost:3000`）
   - 登录获取 Token 或手动粘贴 Token

### 方法二：打包安装

1. 将所有文件打包为 ZIP
2. 重命名为 `.xpi` 扩展名
3. 拖放到 Zen 浏览器的扩展页面

## 使用说明

### 首次配置

1. 点击浏览器工具栏上的插件图标
2. 点击「打开设置」
3. 输入你的 Workspace Navigator 服务器地址
4. 使用以下任一方式获取 Token：
   - **方式一**：直接在设置页使用账号密码登录
   - **方式二**：在导航页登录后，从 LocalStorage 复制 token 粘贴

### 添加书签

1. 浏览任意网页
2. 点击工具栏的插件图标（或使用快捷键 `Ctrl+Shift+S`）
3. 确认或编辑页面信息
4. 选择标签（可点击推荐标签快速添加）
5. 选择工作空间（可选）
6. 点击「保存书签」

### 快捷键

- `Ctrl+Shift+S` - 打开添加书签窗口

## 文件结构

```
browser-extension/
├── manifest.json          # 插件配置（Manifest V2 - Firefox/Zen 兼容）
├── background.js          # 后台脚本（API 调用）
├── content.js             # 内容脚本（获取页面信息）
├── popup.html             # 弹出窗口界面
├── popup.js               # 弹出窗口逻辑
├── popup.css              # 弹出窗口样式
├── options.html           # 设置页面
├── options.js             # 设置页面逻辑
├── generate_icons.py      # 图标生成脚本
├── icons/                 # 图标目录
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # 本文件
```

## 兼容性

- ✅ Zen Browser（基于 Firefox）
- ✅ Firefox（需要 Manifest V2）
- ⚠️ Chrome/Edge（需要改为 Manifest V3）

## 故障排除

### 无法获取页面信息
- 某些页面（如 about: 页面）无法注入 content script，会回退到使用标签页基本信息

### Token 失效
- Token 有过期时间，失效后需要重新登录获取

### 连接失败
- 检查服务器地址是否正确
- 检查网络连接
- 确认后端服务正在运行

## 自定义开发

### 修改 API 地址
编辑 `background.js` 中的 `DEFAULT_CONFIG`：

```javascript
const DEFAULT_CONFIG = {
  baseUrl: 'http://your-server:3000',
  token: null
};
```

### 添加更多快捷键
在 `manifest.json` 的 `commands` 部分添加：

```json
"commands": {
  "your-command": {
    "suggested_key": {
      "default": "Ctrl+Shift+Y"
    },
    "description": "你的功能描述"
  }
}
```

## 许可证

MIT License - 与 Workspace Navigator 主项目一致
