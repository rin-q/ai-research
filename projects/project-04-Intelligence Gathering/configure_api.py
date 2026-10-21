"""Configure the user's own model service without echoing secrets."""
from getpass import getpass
from pathlib import Path
from urllib.parse import urlparse
import shutil

from dotenv import dotenv_values, set_key


def main():
    root = Path(__file__).resolve().parent
    path = root / '.env'
    if not path.exists():
        shutil.copyfile(root / '.env.example', path)
    values = dotenv_values(path)
    print('研潮智枢：配置自己的模型 API（仅写入本机 .env）')
    print('1. 配置模型服务  2. 关闭模型调用，使用本地分析')
    choice = input('请选择 [1/2]：').strip()
    if choice == '2':
        set_key(str(path), 'AI_API_KEY', '')
        print('已清空本地模型密钥。重启服务后生效；独立实验框架需单独配置。')
        return
    if choice != '1':
        print('未修改配置。')
        return
    base = input('API 地址（例如 https://api.deepseek.com/v1）：').strip()
    parsed = urlparse(base)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password:
        raise SystemExit('请输入有效的 HTTP(S) API 地址，不要在地址内放密钥。')
    model = input('模型名称（以服务商提供的名称为准）：').strip()
    if not model or any(c in model + base for c in '\r\n'):
        raise SystemExit('模型和地址不能为空或包含换行。')
    key = getpass('自己的 API Key（输入不可见；留空保留已有值）：').strip()
    if not key and not values.get('AI_API_KEY'):
        raise SystemExit('尚未配置密钥，未修改配置。')
    set_key(str(path), 'AI_BASE_URL', base.rstrip('/'))
    set_key(str(path), 'AI_MODEL', model)
    if key:
        set_key(str(path), 'AI_API_KEY', key)
    print('已保存。请重启服务；不要分享 .env。')


if __name__ == '__main__':
    main()
