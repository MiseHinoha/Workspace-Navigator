#!/usr/bin/env python3
"""
打包 Chrome 扩展为 .crx 格式
Chrome .crx 文件是一个带签名的 ZIP 文件
"""

import os
import sys
import zipfile
import struct
import hashlib
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend

def generate_key_pair(pem_path):
    """生成 RSA 密钥对"""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    # 保存私钥
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    with open(pem_path, 'wb') as f:
        f.write(pem)
    
    return private_key

def create_crx(source_dir, output_crx, pem_path=None):
    """创建 .crx 文件"""
    
    # 生成或加载密钥
    if pem_path and os.path.exists(pem_path):
        with open(pem_path, 'rb') as f:
            private_key = serialization.load_pem_private_key(
                f.read(),
                password=None,
                backend=default_backend()
            )
    else:
        if not pem_path:
            pem_path = 'chrome-extension.pem'
        private_key = generate_key_pair(pem_path)
        print(f"[+] Generated new key: {pem_path}")
    
    # 创建临时 zip
    zip_path = output_crx + '.tmp.zip'
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(source_dir):
            # 排除不需要的文件
            dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', 'dist']]
            
            for file in files:
                if file.endswith(('.pem', '.py', '.pyc')):
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zf.write(file_path, arcname)
    
    # 读取 zip 内容
    with open(zip_path, 'rb') as f:
        zip_content = f.read()
    
    # 签名
    signature = private_key.sign(
        zip_content,
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    
    # 获取公钥
    public_key = private_key.public_key()
    public_key_der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    # 构建 CRX 头部
    # Magic number: Cr24
    magic = b'Cr24'
    # Version: 3
    version = struct.pack('<I', 3)
    # Public key length
    pub_key_len = struct.pack('<I', len(public_key_der))
    # Signature length
    sig_len = struct.pack('<I', len(signature))
    
    # 组装 CRX 文件
    with open(output_crx, 'wb') as f:
        f.write(magic)
        f.write(version)
        f.write(pub_key_len)
        f.write(sig_len)
        f.write(public_key_der)
        f.write(signature)
        f.write(zip_content)
    
    # 清理临时文件
    os.remove(zip_path)
    
    print(f"[OK] Created: {output_crx}")
    print(f"     Key file: {pem_path}")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Pack Chrome Extension to .crx')
    parser.add_argument('--source', default='browser-extension-chrome', help='Source directory')
    parser.add_argument('--output', default='browser-extensions/dist/workspace-navigator-chrome-v1.0.0.crx', help='Output .crx file')
    parser.add_argument('--key', default='browser-extensions/chrome-extension.pem', help='PEM key file')
    
    args = parser.parse_args()
    
    # 确保输出目录存在
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    create_crx(args.source, args.output, args.key)

if __name__ == '__main__':
    main()
