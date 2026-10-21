"""Start the local teaching application from any working directory."""
import argparse
import os
from pathlib import Path
import shutil


def main():
    parser = argparse.ArgumentParser(description="研潮智枢本地教学服务")
    parser.add_argument('--port', type=int, default=8080)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    os.chdir(root)
    if not (root / '.env').exists():
        shutil.copyfile(root / '.env.example', root / '.env')
    from dotenv import load_dotenv
    load_dotenv(root / '.env')
    # Initialize only the bundled example vaults, never a custom user vault.
    for directory in ('knowledge/academic/30-来源/自动采集', 'knowledge/social', 'data'):
        (root / directory).mkdir(parents=True, exist_ok=True)
    import uvicorn
    uvicorn.run('api.main:app', host='127.0.0.1', port=args.port)


if __name__ == '__main__':
    main()
