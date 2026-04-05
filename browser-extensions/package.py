#!/usr/bin/env python3
"""
打包 Workspace Navigator 浏览器插件
生成适用于 Zen/Firefox 和 Chrome 的压缩包
"""

import os
import zipfile
import shutil
from datetime import datetime

def create_zip(source_dir, output_file, exclude=None):
    """创建 ZIP 压缩包"""
    if exclude is None:
        exclude = []
    
    with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # 排除指定目录
            dirs[:] = [d for d in dirs if d not in exclude]
            
            for file in files:
                if file in exclude:
                    continue
                    
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)
                
    print(f"[OK] Created: {output_file}")

def main():
    """主函数"""
    
    # 获取当前目录（browser-extensions）
    base_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(base_dir)
    
    # 版本号
    version = "1.0.0"
    date_str = datetime.now().strftime("%Y%m%d")
    
    # 创建输出目录
    dist_dir = os.path.join(base_dir, 'dist')
    os.makedirs(dist_dir, exist_ok=True)
    
    print("=" * 60)
    print("Workspace Navigator Browser Extension Packager")
    print("=" * 60)
    print()
    
    # 打包 Zen/Firefox 版本
    zen_dir = os.path.join(parent_dir, 'browser-extension-zen')
    if os.path.exists(zen_dir):
        print("[+] Packaging Zen/Firefox version...")
        zen_output = os.path.join(dist_dir, f'workspace-navigator-zen-v{version}-{date_str}.zip')
        create_zip(
            zen_dir, 
            zen_output, 
            exclude=['generate_icons.py', '__pycache__', '.git', 'dist']
        )
    else:
        print(f"[!] Zen version directory not found: {zen_dir}")
    
    print()
    
    # 打包 Chrome 版本
    chrome_dir = os.path.join(parent_dir, 'browser-extension-chrome')
    if os.path.exists(chrome_dir):
        print("[+] Packaging Chrome version...")
        chrome_output = os.path.join(dist_dir, f'workspace-navigator-chrome-v{version}-{date_str}.zip')
        create_zip(
            chrome_dir, 
            chrome_output, 
            exclude=['generate_icons.py', '__pycache__', '.git', 'dist']
        )
    else:
        print(f"[!] Chrome version directory not found: {chrome_dir}")
    
    print()
    print("=" * 60)
    print("[OK] Packaging complete!")
    print(f"Output directory: {dist_dir}")
    print()
    
    # 列出生成的文件
    if os.path.exists(dist_dir):
        files = os.listdir(dist_dir)
        if files:
            print("Generated files:")
            for f in sorted(files):
                file_path = os.path.join(dist_dir, f)
                size = os.path.getsize(file_path)
                size_kb = size / 1024
                print(f"  - {f} ({size_kb:.1f} KB)")
        else:
            print("No files generated")
    
    print("=" * 60)

if __name__ == '__main__':
    main()
