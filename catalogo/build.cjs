#!/usr/bin/env node
/*
 * Gera o catálogo da mova. action a partir de dados.json.
 *
 *   node catalogo/build.cjs              -> PDF em alta resolução (fotos-hd/)
 *   node catalogo/build.cjs --whatsapp   -> PDF leve para enviar no WhatsApp (fotos-web/)
 *   node catalogo/build.cjs --png        -> também salva uma prévia PNG de cada página
 *
 * Requer o pacote "playwright" (Chromium). Edite nomes, preços e textos em dados.json.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const args = new Set(process.argv.slice(2));
const VERSAO = args.has('--whatsapp') ? 'whatsapp' : 'hd';
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'dados.json'), 'utf8'));
const ratios = JSON.parse(fs.readFileSync(path.join(ROOT, 'ferramentas/proporcoes.json'), 'utf8'));
const LOGO = fs.readFileSync(path.join(ROOT, 'marca/logo-mova.svg'), 'utf8');
const loja = data.loja;
if (loja.whatsapp) loja.whatsapp = loja.whatsapp.replace(/ /g, '\u00a0'); // número não quebra de linha

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const usadas = new Set();
function src(id) {
  usadas.add(id);
  const pastas = VERSAO === 'whatsapp' ? ['fotos-web', 'fotos-hd', 'fotos-ajustadas', 'fotos-originais'] : ['fotos-hd', 'fotos-ajustadas', 'fotos-originais'];
  for (const p of pastas) {
    if (fs.existsSync(path.join(ROOT, p, `${id}.jpg`))) return `${p}/${id}.jpg`;
  }
  throw new Error(`foto ${id} não encontrada`);
}
const img = (id, foco, cls = '') =>
  `<img${cls ? ` class="${cls}"` : ''} src="${src(id)}" style="object-position:${foco || '50% 50%'}" alt="">`;
const logo = (cls = '') => `<div class="logo ${cls}">${LOGO}</div>`;

function contato() {
  return loja.whatsapp
    ? `WhatsApp ${esc(loja.whatsapp)}<br>Instagram ${esc(loja.instagram)}`
    : `Chame no direct<br>${esc(loja.instagram)}`;
}
const GRADE = ['P', 'M', 'G'];
// bolinhas de tamanho: preenchida = disponível, só contorno = indisponível
function bolinhas(t, cls = '') {
  const disp = new Set(t || []);
  return `<div class="sizes ${cls}">${GRADE.map((x) => `<span class="sz ${disp.has(x) ? 'on' : 'off'}">${x}</span>`).join('')}</div>`;
}
const rotTam = (t) => (t && t.length > 1 ? 'Tamanhos' : 'Tamanho');
const num = (v) => parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
const brl = (x) => x.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
// preço do look completo: o informado ou a soma das peças (padrão do catálogo antigo)
function lookTotal(p) {
  if (p.look) return p.look;
  if (p.pecas && p.pecas.length > 1 && p.pecas.every((x) => x.preco)) return brl(p.pecas.reduce((a, x) => a + num(x.preco), 0));
  return '';
}
const temDados = (p) => !!(p.preco || lookTotal(p) || (p.tamanhos && p.tamanhos.length));
const kicker = (p) => [`Ref. ${p.ref}`, p.cor, p.nota].filter(Boolean).map(esc).join(' · ');
const pecasHTML = (p) => (p.pecas && p.pecas.length
  ? `<p class="pecas">${p.pecas.map((x) => `<span><b>${esc(x.tipo)} ${esc(x.nome)}</b>${x.preco ? ` R$&nbsp;${esc(x.preco)}` : ''}</span>`).join('')}</p>`
  : '');
function valorLateral(p) {
  const look = lookTotal(p);
  const partes = [];
  if (look) partes.push(`<span class="lbl">Look completo</span><span class="preco">R$ ${esc(look)}</span>`);
  else if (p.preco) partes.push(`<span class="lbl">Valor</span><span class="preco">R$ ${esc(p.preco)}</span>`);
  if (p.tamanhos && p.tamanhos.length) partes.push(`<span class="lbl">${rotTam(p.tamanhos)}</span>${bolinhas(p.tamanhos)}`);
  if (!partes.length) return `<span class="lbl">Valores e tamanhos</span><span class="val">Consulte</span>`;
  if (!(p.tamanhos && p.tamanhos.length)) partes.push(`<span class="lbl">Tamanhos</span><span class="val val-s">Consulte</span>`);
  return partes.join('');
}
const foot = (sec, n) =>
  `<div class="foot">${logo()}<span class="mid">${esc(sec)}</span><span class="num">${String(n).padStart(2, '0')}</span></div>`;

// ---------------------------------------------------------------- páginas
const P = {
  capa() {
    const c = data.capa;
    if (c.modelo === 'revista') {
      const w = Math.min(210, 297 * ratios[c.foto]);
      return `<section class="page p-capa revista">
      <img class="fit" src="${src(c.foto)}" style="width:${w.toFixed(2)}mm" alt="">
      <div class="band" style="width:${(210 - w).toFixed(2)}mm"><span>${esc(loja.edicao)} · Moda fitness feminina</span><span>${esc(loja.instagram)}</span></div>
      ${logo('white')}
    </section>`;
    }
    return `<section class="page p-capa">
      ${logo('white')}
      <div class="kicker kick">${esc(loja.edicao)} · Moda fitness feminina</div>
      <div class="arch-line"></div>
      <div class="arch">${img(c.foto, c.foco)}</div>
      <div class="side l"><span>${esc(loja.instagram)}</span></div>
      <div class="side r"><span>${esc(loja.edicao)}</span></div>
    </section>`;
  },

  boas() {
    const a = data.abertura;
    return `<section class="page p-boas">
      ${logo('toplogo')}
      <div class="kicker">Bem-vinda</div>
      <h1>${esc(loja.slogan)}</h1>
      <p class="txt">${esc(loja.boas_vindas)}</p>
      <div class="ig">${esc(loja.instagram)}</div>
      <div class="arch-line"></div>
      <div class="arch">${img(a.foto, a.foco)}</div>
      <div class="vit">${a.vitrine.map((id) => `<div>${img(id, '50% 30%')}</div>`).join('')}</div>
    </section>`;
  },

  sumario(itens) {
    return `<section class="page p-sum">
      ${logo('toplogo')}
      <h1>Sumário</h1>
      <div class="kicker">${esc(loja.edicao)}</div>
      <ol>${itens
        .map((i) => `<li><span class="n">${esc(i.n)}</span><span class="t">${esc(i.t)}</span><span class="r">${esc(i.r || '')}</span><span class="dots"></span><span class="p">${String(i.p).padStart(2, '0')}</span></li>`)
        .join('')}</ol>
      <div class="thumbs">${['007', '025', '039', '058', '066'].map((id) => `<div>${img(id, '50% 35%')}</div>`).join('')}</div>
    </section>`;
  },

  secao(s) {
    const refs = s.paginas.flatMap((p) => (p.itens ? p.itens.map((i) => i.ref) : [p.ref])).filter(Boolean);
    const faixa = refs.length ? `Ref. ${refs[0]} — ${refs[refs.length - 1]}` : '';
    // posição dos textos abaixo do título, conforme o número de linhas do título
    const linhas = s.titulo.length > 12 ? 2 : 1;
    const yCha = 92 + linhas * 15.5 + 4;
    return `<section class="page p-sec">
      ${logo('white toplogo')}
      <div class="kicker ed">${esc(loja.edicao)}</div>
      <div class="num">${esc(s.numero)}</div>
      <h1>${esc(s.titulo)}</h1>
      <p class="cha" style="top:${yCha}mm">${esc(s.chamada)}</p>
      <p class="txt" style="top:${yCha + (s.chamada.length > 26 ? 21 : 14)}mm">${esc(s.texto)}</p>
      <div class="kicker refs">${esc(faixa)}</div>
      <div class="arch-line"></div>
      <div class="arch">${img(s.foto, s.foco)}</div>
    </section>`;
  },

  cap(p) {
    return `<div class="cap">
      <div class="main">
        <div class="ref">${kicker(p)}</div>
        <h2 class="nome">${esc(p.nome)}</h2>
        <p class="det">${esc(p.detalhe)}</p>
        ${pecasHTML(p)}
        ${p.cores ? `<p class="cores"><b>Cores</b>${esc(p.cores)}</p>` : ''}
      </div>
      <div class="side">${valorLateral(p)}<span class="contato">${contato()}</span></div>
    </div>`;
  },

  duo(p, sec, n) {
    const f = p.foco || {};
    return `<section class="page p-duo">
      <div class="ph ph-duo">${p.fotos.map((id) => img(id, f[id])).join('')}</div>
      ${P.cap(p)}${foot(sec, n)}
    </section>`;
  },

  trio(p, sec, n) {
    const f = p.foco || {};
    const [a, b, c] = p.fotos;
    return `<section class="page p-trio">
      <div class="ph ph-trio">${img(a, f[a], 'big')}<div class="col">${img(b, f[b])}${img(c, f[c])}</div></div>
      ${P.cap(p)}${foot(sec, n)}
    </section>`;
  },

  par(p, sec, n) {
    const half = (i) => `<div class="half">
        <div class="ref">${kicker(i)}</div>
        <h2 class="nome">${esc(i.nome)}</h2>
        <p class="det">${esc(i.detalhe)}</p>
        ${i.cores ? `<p class="cores"><b>Cores</b>${esc(i.cores)}</p>` : ''}
        ${temDados(i)
          ? `<div class="linha">${i.preco ? `<p class="preco">R$ ${esc(i.preco)}</p>` : '<p class="consulte">Consulte valores</p>'}${i.tamanhos && i.tamanhos.length ? bolinhas(i.tamanhos) : ''}</div>`
          : `<p class="consulte">Consulte valores e tamanhos</p>`}
      </div>`;
    return `<section class="page p-par">
      <div class="ph ph-duo">${p.itens.map((i) => img(i.foto, i.foco)).join('')}</div>
      <div class="cap2">${p.itens.map(half).join('')}</div>
      ${foot(sec, n)}
    </section>`;
  },

  grade(p, sec, n) {
    const f = p.foco || {};
    return `<section class="page p-grade">
      <div class="grid">${p.fotos
        .map((id, k) => `<div class="cell">${img(id, f[id])}<span class="chip">${esc(p.legendas[k])}</span></div>`)
        .join('')}</div>
      <div class="cap-band">
        <div><div class="ref">Ref. ${esc(p.ref)} · ${new Set(p.legendas.map((l) => l.split(' · ')[0])).size} cores</div><h2 class="nome" style="margin-top:2mm">${esc(p.nome)}</h2></div>
        <p class="det">${esc(p.detalhe)}</p>
        ${temDados(p)
          ? `<div class="vb">${p.preco ? `<span class="preco">R$ ${esc(p.preco)}</span>` : ''}${p.tamanhos ? bolinhas(p.tamanhos) : ''}</div>`
          : `<div class="val">Consulte valores<br>e tamanhos</div>`}
      </div>
      ${foot(sec, n)}
    </section>`;
  },

  cheia(p, sec, n) {
    return `<section class="page p-cheia">
      <div class="full">${img(p.foto, p.foco)}</div>
      <div class="shade"></div>
      ${logo('toplogo')}
      <div class="ov">
        <div class="ref">${kicker(p)}</div>
        <h2 class="nome">${esc(p.nome)}</h2>
        <p class="det">${esc(p.detalhe)}</p>
        ${temDados(p)
          ? `<div class="linha">${p.preco ? `<p class="val">R$ ${esc(p.preco)}</p>` : ''}${p.tamanhos ? bolinhas(p.tamanhos, 'claro') : ''}</div>`
          : '<p class="val">Consulte valores e tamanhos</p>'}
      </div>
      ${foot(sec, n)}
    </section>`;
  },

  foto(p, sec, n) {
    const r = ratios[p.foto];
    const w = Math.min(210, 297 * r);
    const strip = 210 - w;
    const slim = strip < 20;
    const legenda = p.ref ? `Ref. ${p.ref} · ${p.nome}${p.nota ? ` · ${p.nota}` : ''}` : sec;
    const look = lookTotal(p);
    const info = !slim && temDados(p)
      ? `<div class="info">${(p.pecas || []).map((x) => `<div class="pc"><span class="t">${esc(x.tipo)}</span><span class="n">${esc(x.nome)}</span><span class="v">R$ ${esc(x.preco)}</span></div>`).join('')}
          ${look ? `<div class="pc lk"><span class="t">Look completo</span><span class="v">R$ ${esc(look)}</span></div>` : p.preco ? `<div class="pc lk"><span class="v">R$ ${esc(p.preco)}</span></div>` : ''}
          ${p.tamanhos ? `<span class="t">${rotTam(p.tamanhos)}</span>${bolinhas(p.tamanhos, 'mini')}` : ''}</div>`
      : '';
    return `<section class="page p-foto${slim ? ' slim' : ''}${info ? ' com-info' : ''}" style="background:${p.cor_fundo || 'var(--mauve)'};color:${p.texto_cor || '#fff'}">
      <div class="strip" style="width:${strip.toFixed(2)}mm">
        ${slim ? '<span></span>' : `<div class="logo mini" style="color:inherit;width:${Math.min(strip - 9, 22).toFixed(1)}mm">${LOGO}</div>`}
        <div class="vert">${slim ? '' : `<span class="rot">${esc(p.rotulo)}</span>`}<span class="vref">${esc(legenda)}</span></div>
        ${info}
        <span class="pnum">${String(n).padStart(2, '0')}</span>
      </div>
      <img class="fit" src="${src(p.foto)}" style="width:${w.toFixed(2)}mm" alt="">
    </section>`;
  },

  como(n) {
    const c = data.como_comprar_foto;
    const passos = [
      ['Escolha seus looks', 'Anote a referência (Ref.) e a cor de cada peça que você amou neste catálogo.'],
      ['Confira o tamanho', 'As bolinhas preenchidas mostram os tamanhos disponíveis de cada peça.'],
      ['Fale com a gente', loja.whatsapp
        ? `Envie as referências e o seu tamanho pelo WhatsApp ${loja.whatsapp} ou pelo direct ${loja.instagram}.`
        : `Envie as referências e o seu tamanho pelo direct ${loja.instagram}.`],
      ['Confirme o pedido', 'Confirmamos valores, disponibilidade e a melhor forma de entrega para você.'],
    ];
    return `<section class="page p-como">
      ${logo('toplogo')}
      <h1>Como comprar</h1>
      <div class="steps">${passos.map(([t, d], i) => `<div class="step"><span class="n">${i + 1}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p>${i === 1 ? '<div class="legenda"><i class="sz on">P</i><span>disponível</span><i class="sz off">M</i><span>indisponível</span></div>' : ''}</div></div>`).join('')}</div>
      <div class="box"><div class="kicker">Atendimento</div><div class="ig">${esc(loja.instagram)}</div>${loja.whatsapp ? `<div class="wa">WhatsApp ${esc(loja.whatsapp)}</div>` : ''}</div>
      <p class="aviso">${esc(loja.aviso)}</p>
      <div class="arch-line"></div>
      <div class="arch">${img(c.foto, c.foco)}</div>
      ${foot('Como comprar', n)}
    </section>`;
  },

  fim() {
    return `<section class="page p-fim">
      <div class="ring"></div>
      ${logo('white')}
      <p class="slogan">${esc(loja.slogan)}</p>
      <div class="kicker ig">${esc(loja.instagram)}</div>
      ${loja.whatsapp ? `<div class="wa">WhatsApp ${esc(loja.whatsapp)}</div>` : ''}
    </section>`;
  },
};

// ---------------------------------------------------------------- montagem
// numera as referências na ordem das páginas; "continua" repete a anterior
function numerarRefs() {
  let k = 0;
  const pad = (x) => String(x).padStart(2, '0');
  for (const s of data.secoes) {
    for (const p of s.paginas) {
      if (p.itens) p.itens.forEach((i) => { i.ref = pad(++k); });
      else if (p.nome) p.ref = pad(p.continua ? k : ++k);
    }
  }
}

function montar() {
  numerarRefs();
  const paginas = [];
  // 1: capa, 2: boas-vindas, 3: sumário
  let n = 4;
  const sumario = [];
  const corpo = [];
  for (const s of data.secoes) {
    const refs = s.paginas.flatMap((p) => (p.itens ? p.itens.map((i) => i.ref) : [p.ref])).filter(Boolean);
    sumario.push({ n: s.numero, t: s.titulo, r: refs.length ? `Ref. ${refs[0]}–${refs[refs.length - 1]}` : '', p: n });
    corpo.push(P.secao(s));
    n++;
    const rotulo = `${s.numero} · ${s.titulo}`;
    for (const p of s.paginas) {
      corpo.push(P[p.layout](p, rotulo, n));
      n++;
    }
  }
  sumario.push({ n: '—', t: 'Como comprar', r: '', p: n });
  corpo.push(P.como(n));
  paginas.push(P.capa(), P.boas(), P.sumario(sumario), ...corpo, P.fim());
  return paginas;
}

const paginas = montar();
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(loja.nome)} · ${esc(loja.edicao)}</title>
<link rel="stylesheet" href="catalogo.css"></head><body>
${paginas.join('\n')}
</body></html>`;
const htmlPath = path.join(ROOT, `catalogo-${VERSAO}.html`);
fs.writeFileSync(htmlPath, html);

// confere se todas as fotos recebidas foram usadas (exceto as repetidas)
const todas = fs.readdirSync(path.join(ROOT, 'fotos-originais')).map((f) => f.slice(0, 3));
const repetidas = new Set(data.repetidas || ['032', '087']);
const faltando = todas.filter((id) => !usadas.has(id) && !repetidas.has(id));
console.log(`${paginas.length} páginas · ${usadas.size} fotos usadas${faltando.length ? ` · FALTANDO: ${faltando.join(', ')}` : ''}`);

// ---------------------------------------------------------------- render
(async () => {
  if (args.has('--html')) return; // só gera o HTML
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  });
  fs.mkdirSync(path.join(ROOT, 'saida'), { recursive: true });
  const nome = VERSAO === 'whatsapp' ? 'Catalogo-mova-action-WhatsApp.pdf' : 'Catalogo-mova-action.pdf';
  await page.pdf({ path: path.join(ROOT, 'saida', nome), preferCSSPageSize: true, printBackground: true });
  console.log('PDF:', path.join('saida', nome));

  if (args.has('--png')) {
    const dir = path.join(ROOT, 'saida', 'previa');
    fs.mkdirSync(dir, { recursive: true });
    await page.setViewportSize({ width: 900, height: 1200 });
    await page.emulateMedia({ media: 'print' });
    const els = await page.$$('section.page');
    for (let i = 0; i < els.length; i++) {
      await els[i].screenshot({ path: path.join(dir, `p${String(i + 1).padStart(2, '0')}.png`) });
    }
    console.log('prévias:', els.length);
  }
  await browser.close();
})();
