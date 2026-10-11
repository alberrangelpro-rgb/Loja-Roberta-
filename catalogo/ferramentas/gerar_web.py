"""Gera fotos-web/ (versão leve para WhatsApp) a partir de fotos-hd/.

uso: python ferramentas/gerar_web.py
"""
import glob, os
from PIL import Image

base = os.path.join(os.path.dirname(__file__), '..')
os.makedirs(os.path.join(base, 'fotos-web'), exist_ok=True)
for f in sorted(glob.glob(os.path.join(base, 'fotos-hd', '*.jpg'))):
    im = Image.open(f).convert('RGB')
    im.thumbnail((1100, 1650), Image.LANCZOS)
    im.save(os.path.join(base, 'fotos-web', os.path.basename(f)), quality=80, optimize=True, progressive=True)
print('ok')
