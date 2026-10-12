"""Troca "LEGGING ISABELA 250,00" por "210,00" na foto 040 (fotos-hd/040.jpg).

Usa os próprios glifos da foto: o "2" do "250,00" e o "1" do "130,00" (Top Isabela),
para manter a mesma fonte. Rodar uma vez, depois de upscale.py e aparar_bordas.py.

uso: python ferramentas/corrigir_preco_040.py
"""
import os

import numpy as np
from PIL import Image

base = os.path.join(os.path.dirname(__file__), '..')
path = os.path.join(base, 'fotos-hd', '040.jpg')
im = np.asarray(Image.open(path).convert('RGB'), np.float32)
out = im.copy()

Y0, Y1 = 1691, 1722          # linha "250,00"
TOP_Y0, TOP_Y1 = 636, 666    # linha "130,00"
G2 = (1168, 1185)            # "2"
G1 = (145, 151)              # "1" (de "130,00")
GAP = 11                     # espaço entre letras
X_ZERO = 1222                # início do "0" que vem depois do "5"


def glifo(x0, x1, y0, y1, pad=3):
    """recorta um glifo como (alfa, cor da tinta) usando o fundo ao redor"""
    reg = im[y0 - pad:y1 + pad, x0 - pad:x1 + pad]
    lum = reg.mean(2)
    fundo = np.median(np.concatenate([lum[0], lum[-1], lum[:, 0], lum[:, -1]]))
    tinta = lum.min()
    alfa = np.clip((fundo - lum) / (fundo - tinta), 0, 1)
    cor = reg[lum <= np.percentile(lum, 3)].mean(0)
    return alfa, cor


def fundo_limpo(x0, x1, y0, y1, m=2):
    """refaz o fundo interpolando as bordas (vertical + horizontal)"""
    top = out[y0 - m, x0:x1]; bot = out[y1 + m, x0:x1]
    lef = out[y0:y1, x0 - m]; rig = out[y0:y1, x1 + m]
    h, w = y1 - y0, x1 - x0
    ty = np.linspace(0, 1, h)[:, None, None]; tx = np.linspace(0, 1, w)[None, :, None]
    v = top[None] * (1 - ty) + bot[None] * ty
    hz = lef[:, None] * (1 - tx) + rig[:, None] * tx
    out[y0:y1, x0:x1] = (v + hz) / 2


a2, c2 = glifo(*G2, Y0, Y1)
a1, c1 = glifo(*G1, TOP_Y0, TOP_Y1)

# apaga "2" e "5" (amostra o fundo no vão entre o "5" e o "0", sem pegar tinta)
fundo_limpo(G2[0] - 6, X_ZERO - 7, Y0 - 5, Y1 + 5)

# posiciona "1" e "2" da direita para a esquerda, mantendo o alinhamento à direita
x1_fim = X_ZERO - GAP
x1_ini = x1_fim - (G1[1] - G1[0])
x2_fim = x1_ini - GAP
x2_ini = x2_fim - (G2[1] - G2[0])


def cola(alfa, cor, x, y):
    h, w = alfa.shape
    reg = out[y:y + h, x:x + w]
    out[y:y + h, x:x + w] = reg * (1 - alfa[..., None]) + cor * alfa[..., None]


pad = 3
cola(a1, c2, x1_ini - pad, Y0 - pad + (Y1 - Y0) - (TOP_Y1 - TOP_Y0))
cola(a2, c2, x2_ini - pad, Y0 - pad)
Image.fromarray(np.clip(out + .5, 0, 255).astype(np.uint8)).save(path, quality=95, subsampling=0, optimize=True)
print('ok: 250,00 -> 210,00')
