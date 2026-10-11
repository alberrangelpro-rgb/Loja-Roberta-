"""Vetoriza a logo mova. action (branca sobre malva) em SVG com potrace.

uso: python vectorize_logo.py logo.jpg saida.svg
"""
import sys

import numpy as np
import potrace
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
a = np.asarray(im, np.float32)
bg = np.median(a[:40, :40].reshape(-1, 3), axis=0)
# alfa = quanto o pixel se aproxima do branco a partir do fundo
alpha = np.clip(((a - bg) / (255.0 - bg)).mean(axis=2), 0, 1)
ys, xs = np.where(alpha > 0.15)
pad = 12
y0, y1, x0, x1 = ys.min() - pad, ys.max() + pad, xs.min() - pad, xs.max() + pad
alpha = alpha[y0:y1, x0:x1]
S = 6  # superamostragem para curvas suaves
img = Image.fromarray((alpha * 255).astype(np.uint8)).resize(
    (alpha.shape[1] * S, alpha.shape[0] * S), Image.LANCZOS).filter(ImageFilter.GaussianBlur(S * 0.35))
bm = potrace.Bitmap(np.asarray(img) <= 118)  # potracer: False = tinta
plist = bm.trace(turdsize=40, alphamax=1.0, opticurve=True, opttolerance=0.2)

W, H = img.size
parts = []
for curve in plist:
    sp = curve.start_point
    d = [f'M{sp.x:.1f},{sp.y:.1f}']
    for seg in curve.segments:
        if seg.is_corner:
            d.append(f'L{seg.c.x:.1f},{seg.c.y:.1f}L{seg.end_point.x:.1f},{seg.end_point.y:.1f}')
        else:
            d.append(f'C{seg.c1.x:.1f},{seg.c1.y:.1f} {seg.c2.x:.1f},{seg.c2.y:.1f} '
                     f'{seg.end_point.x:.1f},{seg.end_point.y:.1f}')
    d.append('Z')
    parts.append(''.join(d))
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">'
       f'<path fill="currentColor" fill-rule="evenodd" d="{" ".join(parts)}"/></svg>')
open(dst, 'w').write(svg)
print('ok', W, H, len(plist), 'curvas')
