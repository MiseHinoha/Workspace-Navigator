# 图标文件

请将以下尺寸的 PNG 图标放入此目录：

- `icon16.png` - 16x16 像素
- `icon32.png` - 32x32 像素
- `icon48.png` - 48x48 像素
- `icon128.png` - 128x128 像素

## 临时解决方案

可以使用在线工具生成图标，例如：
- [Favicon.io](https://favicon.io/)
- [Canva](https://www.canva.com/)

或者使用下面的命令生成简单图标（需要 ImageMagick）：

```bash
# 创建一个简单的蓝色方块图标
convert -size 128x128 xc:#3b82f6 -pointsize 60 -fill white -gravity center -annotate +0+0 "W" icon128.png
convert -size 48x48 xc:#3b82f6 -pointsize 24 -fill white -gravity center -annotate +0+0 "W" icon48.png
convert -size 32x32 xc:#3b82f6 -pointsize 16 -fill white -gravity center -annotate +0+0 "W" icon32.png
convert -size 16x16 xc:#3b82f6 -pointsize 8 -fill white -gravity center -annotate +0+0 "W" icon16.png
```

## 图标设计建议

建议使用与 Workspace Navigator 品牌一致的颜色：
- 主色：`#3b82f6`（蓝色）
- 白色文字或图标元素

形状建议：书签、导航、网格或字母 "W"
