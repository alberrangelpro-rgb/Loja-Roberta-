"""Remove as linhas pretas laterais das fotos que vieram de print de tela (fotos-hd/)
e atualiza ferramentas/proporcoes.json. Rodar depois de upscale.py.

uso: python ferramentas/aparar_bordas.py
"""
import glob, json, os

import numpy as np
from PIL import Image

base = os.path.join(os.path.dirname(__file__), '..')


def borda(cols):
    n = 0
    for c in cols:
        if c.mean() < 25 and c.std() < 20:  # só linha preta de verdade
            n += 1
        else:
            break
    return n


ratios = {}
for f in sorted(glob.glob(os.path.join(base, 'fotos-hd', '*.jpg'))):
    im = Image.open(f).convert('RGB')
    a = np.asarray(im.convert('L'), np.float32)
    h, w = a.shape
    lim = int(w * 0.01)  # a linha do print tem poucos pixels
    l = borda(a[:, i] for i in range(lim))
    r = borda(a[:, w - 1 - i] for i in range(lim))
    if (l or r) and max(l, r) < lim:
        m = max(l, r) + 3  # corte simétrico com folga
        im = im.crop((m, 0, w - m, h))
        im.save(f, quality=95, subsampling=0, optimize=True)
        print(os.path.basename(f), f'-{m}px por lado')
    ratios[os.path.basename(f)[:3]] = round(im.width / im.height, 4)
json.dump(ratios, open(os.path.join(base, 'ferramentas', 'proporcoes.json'), 'w'))
