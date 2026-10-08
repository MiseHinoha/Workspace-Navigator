# Workspace Navigator - 项目规划

> 记录时间：2026-05-15
> 状态：想法收集阶段，待进一步细化

---

## 方向一：开源 + 自托管登录（Bitwarden 模式）

### 目标
让项目成为可自托管的开源工作空间导航工具，用户可以选择使用官方托管服务或部署到自己的服务器。

### 核心改动

| 模块 | 改动点 |
|------|--------|
| **插件配置** | 增加「服务器地址」配置项，支持用户填入自托管站点地址 |
| **认证方式** | 保留现有 JWT 登录，新增 API Token 登录（方便快捷登录/脚本场景） |
| **部署文档** | 补充「自托管指南」「数据备份/迁移指南」「环境变量说明」 |
| **免登录模式** | 考虑增加「单用户本地模式」，跳过认证直接使用（适合纯本地场景） |

### 技术细节
- 插件侧：在 `options.js` 中新增服务器地址输入，存储到 `chrome.storage.sync`
- 后端侧：保留现有 JWT 逻辑，增加 Token 生成/管理接口
- 部署侧：Docker 镜像优化，减少构建体积

### 参考模式
- **Bitwarden**：云服务 + 自托管双模式
- **Jellyfin**：纯自托管，社区驱动

---

## 方向二：主题系统 + 主题商城

### 目标
将导航页从单一视觉风格升级为可自由切换的主题系统，最终形成「官方主题 + 社区主题商城」的生态。

### 主题系统设计

#### 1. 架构层级

```
主题系统
├── 核心框架（不可变）
│   ├── 布局网格系统
│   ├── 组件结构（Workspace / Bookmark / SearchBar 等）
│   └── 交互逻辑（拖拽、搜索、切换）
│
├── 主题层（可替换）
│   ├── 视觉变量（CSS Variables）
│   ├── 组件样式（覆盖/扩展）
│   ├── 动画效果（CSS / JS）
│   └── 字体与图标集
│
└── 主题市场（未来）
    ├── 官方主题仓库
    └── 社区提交审核
```

#### 2. 主题配置规范（设计规范雏形）

每个主题为一个独立文件夹/JSON 配置包：

```typescript
interface ThemeConfig {
  id: string;           // 主题唯一标识
  name: string;         // 显示名称
  version: string;      // 主题版本
  author: string;       // 作者
  description: string;  // 简介

  // 视觉变量映射
  variables: {
    // 颜色
    '--bg-primary': string;
    '--bg-secondary': string;
    '--text-primary': string;
    '--text-secondary': string;
    '--accent-color': string;
    '--border-color': string;

    // 间距与形状
    '--card-radius': string;
    '--card-padding': string;
    '--grid-gap': string;

    // 字体
    '--font-family': string;
    '--font-size-base': string;

    // 动画时长
    '--transition-fast': string;
    '--transition-normal': string;
  };

  // 组件级样式覆盖（可选）
  componentOverrides?: {
    'WorkspaceCanvas'?: string;   // CSS 字符串或外链
    'BookmarkCard'?: string;
    'SearchBar'?: string;
  };

  // 特效（可选）
  effects?: {
    crt?: boolean;        // CRT 扫描线
    scanlines?: boolean;  // 水平扫描线
    noise?: boolean;      // 噪点层
    glow?: boolean;       // 发光效果
  };

  // 图标集（可选）
  icons?: {
    source: 'default' | 'custom' | 'url';
    customSet?: Record<string, string>; // iconName → svg string
  };

  // 背景
  background?: {
    type: 'solid' | 'gradient' | 'image' | 'pattern' | 'animated';
    value: string;
  };
}
```

#### 3. 官方主题计划

| 主题 | 风格 | 特点 |
|------|------|------|
| **Default** | 现代简洁 | 当前默认风格，干净清爽 |
| **Pixel Retro** | 像素复古 | CRT 扫描线 + 像素图标 + 药水瓶/卡带式书签卡片 |
| **Dark Pro** | 深色专业 | 暗色主题，适合夜间使用 |
| **Minimal** | 极简 | 大量留白，文字为主 |

#### 4. Pixel Retro 主题详细设计（Gemini 建议落地）

**书签卡片 = 游戏卡带/药水瓶**
- 形状：圆角矩形，底部略宽（药水瓶轮廓）
- 图标：像素风 favicon，使用 `image-rendering: pixelated`
- 标签色：不同分类 = 不同颜色瓶盖/瓶身

**Hover 交互**
```css
@keyframes pixel-bounce {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-4px); }
  50% { transform: translateY(0); }
  75% { transform: translateY(-2px); }
}

.bookmark-card:hover {
  animation: pixel-bounce 0.4s steps(2);
}
```

**CRT 扫描线效果**
```css
.crt-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.03) 0px,
    rgba(0, 0, 0, 0.03) 1px,
    transparent 1px,
    transparent 2px
  );
  /* 可选：微弱的颜色偏移 */
  box-shadow: inset 0 0 100px rgba(0,0,0,0.3);
}
```

**可选增强**
- 偶尔闪烁（模拟信号不稳）：极低概率触发一次亮度变化
- 暗角效果：四角轻微变暗

#### 5. 主题切换实现

前端架构调整：
```
stores/themeStore.ts     // 主题状态管理（当前主题、切换逻辑）
themes/                  // 内置主题文件夹
├── default/
├── pixel-retro/
├── dark-pro/
└── index.ts             // 注册所有主题
types/theme.ts           // ThemeConfig 类型定义
```

切换方式：
- 用户设置面板中选择主题
- 主题切换时动态加载对应的 CSS 变量和样式文件
- 使用 CSS Variables 实现无闪烁切换

#### 6. 主题市场（远期）

```
主题市场
├── 浏览 / 搜索 / 分类
├── 一键安装（下载主题包 → 存入 localStorage / IndexedDB）
├── 用户上传（提交 theme.json + 预览图）
├── 审核机制（官方审核后上架）
└── 评分/评论系统
```

**社区主题设计规范（给主题作者）**
- 主题包格式说明
- CSS Variables 完整列表
- 组件选择器参考
- 预览图尺寸要求
- 动画性能建议（60fps 标准）

---

## 方向三：版本更新检查

### 目标
让用户知道是否有新版本可用，自主决定是否升级。

### 方案

**检查来源**
```
GitHub Releases API:
GET https://api.github.com/repos/{owner}/workspace-navigator/releases/latest
```

**检查策略**
| 方式 | 说明 |
|------|------|
| 启动时检查 | 每次打开导航页时检查（频率低） |
| 每日检查 | 用 `localStorage` 记录上次检查时间，24h 内只查一次 |
| 手动检查 | 设置面板中提供「检查更新」按钮 |

**版本号存储**
- 前端 `package.json` 的 `version` 字段
- 打包时通过 Vite `define` 注入：`__APP_VERSION__`

**用户提示**
```
┌─────────────────────────────────────────┐
│  🎉 新版本 v1.2.0 可用                  │
│                                         │
│  更新内容：                              │
│  • 新增 Pixel Retro 主题                │
│  • 修复拖拽排序问题                      │
│                                         │
│  [查看详情]      [稍后再说]  [忽略此版本] │
└─────────────────────────────────────────┘
```

**自托管用户更新**
- 前端更新：提醒用户拉取最新 Docker 镜像
- 后端更新：Release 说明中标注是否需要数据库迁移
- 提供一键更新命令：`docker pull ... && docker-compose up -d`

**前后端版本兼容性**
- 后端增加 `GET /api/version` 接口返回后端版本
- 前端启动时对比前后端版本，如有不兼容则提示

---

## 优先级建议

| 优先级 | 方向 | 理由 |
|--------|------|------|
| P0 | 开源准备 | 清理代码、完善 README、选择 LICENSE |
| P1 | 自托管登录 | 插件改配置项，后端兼容，工作量小但核心价值大 |
| P1 | 版本检查 | 逻辑简单，对开源项目来说是标配功能 |
| P2 | 主题系统框架 | 先做「Default + Pixel Retro」两个主题验证架构 |
| P3 | 主题商城 | 等有社区需求后再做，前期靠 GitHub 手动分享主题包 |

---

## 待思考问题

### 开源相关
- [ ] 选择什么开源协议？（MIT / AGPL / MPL？）
- [ ] 是否需要贡献者协议 (CLA)？
- [ ] 后端 SQLite 数据库结构是否稳定？（开源后变更成本高）
- [ ] 是否提供官方托管服务？（涉及运维成本）

### 主题系统相关
- [ ] 主题包是存前端（localStorage）还是后端（用户配置）？
- [ ] 自定义 CSS 如何防止 XSS？（社区主题的安全问题）
- [ ] 是否支持动态加载外部主题（URL）？
- [ ] 主题预览机制怎么做？（切换前先预览）

### 版本更新相关
- [ ] 是否支持自动更新（前端热更新）还是只提示？
- [ ] 数据库迁移脚本如何随版本发布？
- [ ] 是否需要 LTS / 稳定版 / 测试版 通道？

---

## 记录

- 2026-05-15：收集三个方向的核心想法，主题系统概念设计完成
