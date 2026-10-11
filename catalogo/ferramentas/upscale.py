"""Amplia fotos com Real-ESRGAN (realesr-general-x4v3) usando ONNX Runtime, sem PyTorch.

Lê os pesos .pth (zip do torch) com um unpickler próprio, monta o grafo
SRVGGNetCompact em ONNX e roda na CPU. Mistura os modelos x4v3 e wdn-x4v3
(denoise_strength), como o script oficial, e reduz a saída 4x para o fator final
com Lanczos para um resultado natural.

uso: python upscale.py <pasta_entrada> <pasta_saida> [--scale 2] [--denoise 0.5] [--only 001,002]
"""
import argparse, glob, io, os, pickle, sys, time, zipfile

import numpy as np
import onnx
import onnxruntime as ort
from onnx import TensorProto, helper, numpy_helper
from PIL import Image


def load_pth(path):
    zf = zipfile.ZipFile(path)
    prefix = zf.namelist()[0].split('/')[0]

    class Storage:
        def __init__(self, key, dtype):
            raw = zf.read(f'{prefix}/data/{key}')
            self.arr = np.frombuffer(raw, dtype=dtype)

    dtypes = {'FloatStorage': np.float32, 'HalfStorage': np.float16, 'LongStorage': np.int64}

    def rebuild_tensor(storage, offset, size, stride, *args):
        a = storage.arr
        itemsize = a.itemsize
        return np.lib.stride_tricks.as_strided(
            a[offset:], shape=tuple(size), strides=tuple(s * itemsize for s in stride)).copy()

    class U(pickle.Unpickler):
        def find_class(self, mod, name):
            if name == '_rebuild_tensor_v2':
                return rebuild_tensor
            if mod == 'torch' and name in dtypes:
                return name
            if mod == 'collections' and name == 'OrderedDict':
                import collections
                return collections.OrderedDict
            raise pickle.UnpicklingError(f'blocked {mod}.{name}')

        def persistent_load(self, pid):
            _, stype, key, _loc, _n = pid
            return Storage(key, dtypes[stype if isinstance(stype, str) else stype])

    return U(io.BytesIO(zf.read(f'{prefix}/data.pkl'))).load()


def build_model(params, scale=4):
    nodes, inits = [], []
    x = 'input'
    idx = 0
    convs = sorted({int(k.split('.')[1]) for k in params if k.startswith('body.')})
    for i in convs:
        w = params.get(f'body.{i}.weight')
        if w is None:
            continue
        if w.ndim == 4:  # conv
            b = params[f'body.{i}.bias']
            inits += [numpy_helper.from_array(w.astype(np.float32), f'w{i}'),
                      numpy_helper.from_array(b.astype(np.float32), f'b{i}')]
            out = f'c{i}'
            nodes.append(helper.make_node('Conv', [x, f'w{i}', f'b{i}'], [out], pads=[1, 1, 1, 1],
                                          kernel_shape=[3, 3]))
            x = out
        else:  # prelu
            inits.append(numpy_helper.from_array(w.reshape(-1, 1, 1).astype(np.float32), f'p{i}'))
            out = f'a{i}'
            nodes.append(helper.make_node('PRelu', [x, f'p{i}'], [out]))
            x = out
    nodes.append(helper.make_node('DepthToSpace', [x], ['ps'], blocksize=scale, mode='CRD'))
    inits.append(numpy_helper.from_array(np.array([1, 1, scale, scale], np.float32), 'scales'))
    nodes.append(helper.make_node('Resize', ['input', '', 'scales'], ['base'], mode='nearest'))
    nodes.append(helper.make_node('Add', ['ps', 'base'], ['output']))
    g = helper.make_graph(nodes, 'srvgg',
                          [helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, 3, None, None])],
                          [helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, 3, None, None])],
                          inits)
    m = helper.make_model(g, opset_imports=[helper.make_opsetid('', 17)])
    m.ir_version = 8
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--models', default=os.path.join(os.path.dirname(__file__), '..', '..', 'models'))
    ap.add_argument('--scale', type=float, default=2.0)
    ap.add_argument('--denoise', type=float, default=0.5)
    ap.add_argument('--only', default='')
    a = ap.parse_args()

    p1 = load_pth(os.path.join(a.models, 'realesr-general-x4v3.pth'))
    p2 = load_pth(os.path.join(a.models, 'realesr-general-wdn-x4v3.pth'))
    p1 = p1.get('params', p1); p2 = p2.get('params', p2)
    params = {k: a.denoise * p1[k] + (1 - a.denoise) * p2[k] for k in p1}
    model = build_model(params)
    so = ort.SessionOptions(); so.intra_op_num_threads = os.cpu_count()
    sess = ort.InferenceSession(model.SerializeToString(), so, providers=['CPUExecutionProvider'])

    os.makedirs(a.dst, exist_ok=True)
    only = set(filter(None, a.only.split(',')))
    files = sorted(glob.glob(os.path.join(a.src, '*.jpg')))
    for f in files:
        name = os.path.splitext(os.path.basename(f))[0]
        if only and name not in only:
            continue
        out_path = os.path.join(a.dst, name + '.jpg')
        if os.path.exists(out_path):
            continue
        t = time.time()
        im = Image.open(f).convert('RGB')
        arr = np.asarray(im, np.float32).transpose(2, 0, 1)[None] / 255.0
        y = sess.run(['output'], {'input': arr})[0][0]
        y = (np.clip(y.transpose(1, 2, 0), 0, 1) * 255.0 + 0.5).astype(np.uint8)
        big = Image.fromarray(y)
        tw, th = round(im.width * a.scale), round(im.height * a.scale)
        if (tw, th) != big.size:
            big = big.resize((tw, th), Image.LANCZOS)
        big.save(out_path, quality=95, subsampling=0, optimize=True)
        print(f'{name}: {im.size} -> {big.size} em {time.time() - t:.1f}s', flush=True)


if __name__ == '__main__':
    main()
