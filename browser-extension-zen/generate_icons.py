#!/usr/bin/env python3
"""
生成 Workspace Navigator 浏览器插件图标
需要安装 Pillow: pip install Pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    """创建指定尺寸的图标"""
    
    # 创建图像
    img = Image.new('RGBA', (size, size), (59, 130, 246, 255))  # #3b82f6
    draw = ImageDraw.Draw(img)
    
    # 尝试使用系统字体
    try:
        # Windows
        font_size = int(size * 0.5)
        try:
            font = ImageFont.truetype("segoeui.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("Arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # 绘制字母 W
    text = "W"
    
    # 获取文本边界框
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # 计算居中位置
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - int(size * 0.05)
    
    # 绘制文字（白色）
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    # 保存
    img.save(output_path, 'PNG')
    print(f"Created: {output_path} ({size}x{size})")

def main():
    """生成所有尺寸的图标"""
    
    sizes = [16, 32, 48, 128]
    
    # 确保 icons 目录存在
    os.makedirs('icons', exist_ok=True)
    
    print("Generating icons for Workspace Navigator extension...")
    print("-" * 50)
    
    for size in sizes:
        output_path = f'icons/icon{size}.png'
        create_icon(size, output_path)
    
    print("-" * 50)
    print("Done! Icons are ready in the 'icons' folder.")

if __name__ == '__main__':
    main()
