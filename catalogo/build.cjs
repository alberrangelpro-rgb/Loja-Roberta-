#!/usr/bin/env node
/*
 * Gera o catálogo da mova. action a partir de dados.json, no formato tela de celular
 * (1080 × 1920, como o catálogo 2026 anterior): cada foto ocupa a página inteira,
 * com a faixa de informações (tipo · cor, nome, preço e bolinhas de tamanho).
 *
 *   node build.cjs              -> PDF em alta definição (fotos-hd/)
 *   node build.cjs --whatsapp   -> PDF leve para enviar no WhatsApp (fotos-web/)
 *   node build.cjs --png        -> também salva uma prévia PNG de cada página
 *   node build.cjs --html       -> só gera o HTML
 *
 * Requer o pacote "playwright" (Chromium). Edite nomes, preços e tamanhos em dados.json.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const args = new Set(process.argv.slice(2));
const VERSAO = args.has('--whatsapp') ? 'whatsapp' : 'hd';
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'dados.json'), 'utf8'));
const LOGO = fs.readFileSync(path.join(ROOT, 'marca/logo-mova.svg'), 'utf8');
const loja = data.loja;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nb = (s) => esc(s).replace(/ /g, '&nbsp;'); // não quebra de linha
const pad = (n) => String(n).padStart(2, '0');

const usadas = new Set();
function src(id) {
  usadas.add(id);
  const pastas = VERSAO === 'whatsapp'
    ? ['fotos-web', 'fotos-hd', 'fotos-ajustadas', 'fotos-originais']
    : ['fotos-hd', 'fotos-ajustadas', 'fotos-originais'];
  for (const p of pastas) {
    if (fs.existsSync(path.join(ROOT, p, `${id}.jpg`))) return `${p}/${id}.jpg`;
  }
  throw new Error(`foto ${id} não encontrada`);
}
const bg = (id, x = 50) => `<img class="bg" src="${src(id)}" style="object-position:${x}% 50%" alt="">`;
const logo = (cls = '') => `<div class="logo ${cls}">${LOGO}</div>`;

// ---------------------------------------------------------------- valores e tamanhos
const GRADE = ['P', 'M', 'G'];
function bolinhas(t) {
  const disp = new Set(t || []);
  return `<div class="sizes">${GRADE.map((x) => `<span class="sz ${disp.has(x) ? 'on' : 'off'}">${x}</span>`).join('')}</div>`;
}
const rotTam = (t) => (t && t.length > 1 ? 'Tamanhos' : 'Tamanho');
const num = (v) => parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
const brl = (x) => x.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
// look completo: o informado ou a soma das peças
function lookTotal(p) {
  if (p.look) return p.look;
  if (p.pecas && p.pecas.length > 1 && p.pecas.every((x) => x.preco)) return brl(p.pecas.reduce((a, x) => a + num(x.preco), 0));
  return '';
}
const nomeProduto = (p) => (p.pecas ? p.pecas.map((x) => `${x.tipo} ${x.nome}`).join(' + ') : `${p.tipo} ${p.nome}`);
const nomesPecas = (p) => [...new Set(p.pecas.map((x) => x.nome))].join(' + ');

// ---------------------------------------------------------------- montagem das páginas
// 1) lista de páginas (para saber os números das páginas nos índices)
const paginas = [{ tipo: 'capa' }, { tipo: 'intro' }, { tipo: 'como' }];
let ref = 0;
for (const s of data.secoes) {
  const abre = { tipo: 'abertura', secao: s, itens: [] };
  paginas.push(abre);
  const vistos = new Map();
  for (const p of s.produtos) {
    if (p.poster) {
      const pg = { tipo: 'poster', secao: s, foto: p.poster, grupo: p.grupo };
      paginas.push(pg);
      if (p.grupo && !vistos.has(p.grupo)) vistos.set(p.grupo, pg);
      continue;
    }
    p.ref = pad(++ref);
    p.fotos.forEach((f) => {
      const pg = { tipo: f.impresso ? 'impresso' : p.pecas ? 'look' : 'produto', secao: s, produto: p, foto: f };
      paginas.push(pg);
      const chave = p.grupo || nomeProduto(p);
      if (!vistos.has(chave)) vistos.set(chave, pg);
    });
  }
  abre.vistos = vistos;
}
paginas.push({ tipo: 'fim' });
paginas.forEach((pg, i) => { pg.n = i + 1; });
for (const pg of paginas) {
  if (pg.tipo === 'abertura') pg.itens = [...pg.vistos].map(([t, alvo]) => ({ t, p: alvo.n }));
}

// 2) desenha cada tipo de página
const topo = (pg) => {
  const r = pg.produto ? `<span class="ref">Ref. ${pg.produto.ref}</span>` : '';
  return `<div class="shade-top"></div>
    <div class="top">${logo()}<div class="tag">${esc(pg.secao.titulo)} · ${pad(pg.n)}${r}</div></div>`;
};

const R = {
  capa() {
    const c = data.capa;
    const secoes = [...new Set(data.secoes.map((s) => s.titulo))].slice(0, 4);
    return `<section class="page p-capa">
      ${bg(c.foto, c.x)}
      <div class="shade-top"></div><div class="shade-bot"></div>
      <div class="topo"><span>${esc(loja.edicao)}</span><span>Moda fitness</span></div>
      ${logo('marca')}
      <div class="base"><ul>${secoes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul><span class="ig">${esc(loja.instagram)}</span></div>
    </section>`;
  },

  intro() {
    const aberturas = paginas.filter((x) => x.tipo === 'abertura');
    const linhas = aberturas.map((a) => {
      const grupos = a.secao.produtos.some((p) => p.grupo);
      const nomes = [...new Set(a.secao.produtos.map((p) => (grupos ? p.grupo : p.pecas ? nomesPecas(p) : p.nome)))];
      return `<li><span class="n">${esc(a.secao.numero)}</span>
        <div><h3>${esc(a.secao.indice || a.secao.titulo)}</h3><p>${nomes.map(esc).join(' · ')}</p></div>
        <span class="p">p. ${pad(a.n)}</span></li>`;
    });
    return `<section class="page p-intro">
      <div class="hdr">${logo()}<div class="tag">${esc(loja.edicao)}</div></div>
      <div class="corpo">
        <h1>${esc(loja.slogan)}</h1>
        <p class="txt">${esc(loja.boas_vindas)}</p>
        <div class="kicker">Nesta edição</div>
        <ol>${linhas.join('')}</ol>
      </div>
      <div class="rodape"><span>WhatsApp ${nb(loja.whatsapp)}</span><span>${esc(loja.instagram)}</span></div>
    </section>`;
  },

  como() {
    const c = data.como_comprar;
    const passos = [
      ['Escolha seus looks', 'Anote a referência (Ref.) e a cor de cada peça que você amou.'],
      ['Confira o tamanho', 'As bolinhas preenchidas mostram os tamanhos disponíveis.'],
      ['Fale com a gente', 'Envie as referências e o seu tamanho pelo WhatsApp ou pelo direct.'],
      ['Confirme o pedido', 'Confirmamos valores, disponibilidade e a melhor forma de entrega.'],
    ];
    return `<section class="page p-como">
      ${bg(c.foto, c.x)}
      <div class="shade-bot alta"></div>
      <div class="shade-top"></div>
      <div class="top">${logo()}<div class="tag">Como comprar</div></div>
      <div class="como">
        <h2>Como comprar</h2>
        <div class="steps">${passos.map(([t, d], i) => `<div class="st"><span class="n">${i + 1}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p>${i === 1
          ? '<div class="legenda"><span class="sz on">P</span><span>disponível</span><span class="sz off">M</span><span>indisponível</span></div>'
          : ''}</div></div>`).join('')}</div>
        <div class="contato"><span>WhatsApp ${nb(loja.whatsapp)}</span><span>${esc(loja.instagram)}</span></div>
      </div>
    </section>`;
  },

  abertura(pg) {
    const s = pg.secao;
    const a = s.abertura;
    const uma = pg.itens.some((i) => i.t.length > 20);
    return `<section class="page p-abre${a.titulo === 'claro' ? ' claro' : ''}">
      ${bg(a.foto, a.x)}
      ${a.titulo === 'claro' ? '<div class="shade-top"></div>' : ''}
      <div class="shade-bot"></div>
      <h1 class="titulo fit" data-min="150">${esc(s.titulo)}</h1>
      <p class="sub"><span class="n">${esc(s.numero)}</span><span class="script">${esc(s.script)}</span></p>
      <div class="lista">
        <p class="texto">${esc(s.texto)}</p>
        <ul class="${uma ? 'uma' : ''}">${pg.itens.map((i) => `<li><span class="t">${esc(i.t)}</span><span class="pg">${pad(i.p)}</span></li>`).join('')}</ul>
      </div>
    </section>`;
  },

  produto(pg) {
    const p = pg.produto, f = pg.foto;
    const tam = f.tamanhos || p.tamanhos || [];
    const kicker = [p.tipo, f.cor || p.cor].filter(Boolean).join(' · ');
    return `<section class="page p-prod">
      ${bg(f.id, f.x)}
      <div class="shade-bot"></div>
      ${topo(pg)}
      <div class="info">
        ${f.script ? `<p class="script">${esc(f.script)}</p>` : ''}
        <div class="row">
          <div class="left">
            <div class="kicker">${esc(kicker)}</div>
            <h2 class="nome fit" data-min="64">${esc(p.nome)}</h2>
            <div class="preco">${p.preco ? `R$ ${esc(p.preco)}` : 'Consulte valores'}</div>
          </div>
          <div class="right">
            <span class="lbl">${rotTam(tam)}</span>
            ${tam.length ? bolinhas(tam) : '<span class="consulte">Consulte</span>'}
          </div>
        </div>
      </div>
    </section>`;
  },

  look(pg) {
    const p = pg.produto, f = pg.foto;
    const tam = f.tamanhos || p.tamanhos || [];
    const total = lookTotal(p);
    const [a, b] = p.pecas;
    const peca = (x, cls) => `<div class="pc ${cls}"><span class="lbl">${esc(x.tipo)}</span>
      <h2 class="nome fit" data-min="60">${esc(x.nome)}</h2>
      <div class="preco">${x.preco ? `R$ ${esc(x.preco)}` : 'Consulte'}</div></div>`;
    return `<section class="page p-look">
      ${bg(f.id, f.x)}
      <div class="shade-bot"></div>
      ${topo(pg)}
      <div class="info look">
        ${f.script ? `<p class="script">${esc(f.script)}</p>` : ''}
        <div class="kicker">${esc(['Look', f.cor || p.cor].filter(Boolean).join(' · '))}</div>
        <div class="pecas">${peca(a, '')}${peca(b, 'r')}</div>
        <div class="div"></div>
        <div class="row2">
          <div class="tam"><span class="lbl">${rotTam(tam)}</span>${tam.length ? bolinhas(tam) : '<span class="consulte">Consulte</span>'}</div>
          ${total ? `<div class="lk"><span class="lbl">Look completo</span><b>R$ ${esc(total)}</b></div>` : ''}
        </div>
      </div>
    </section>`;
  },

  // foto que já vem com nome e preço escritos: fica como está, sem a faixa de informações
  impresso(pg) {
    const f = pg.foto;
    return `<section class="page p-impresso">
      ${bg(f.id, f.x)}
      ${topo(pg)}
    </section>`;
  },

  // abertura de cartela do Editorial (Rose, Dual, Petrol, Mocha): nada por cima do título impresso
  poster(pg) {
    return `<section class="page p-poster">
      ${bg(pg.foto, 50)}
      <div class="shade-bot curta"></div>
      <div class="base">${logo()}<div class="tag">${esc(pg.secao.titulo)} · ${pad(pg.n)}</div></div>
    </section>`;
  },

  fim() {
    return `<section class="page p-fim">
      ${logo()}
      <div class="pedido">
        <div class="lbl">Peça pelo WhatsApp</div>
        <div class="tel">${nb(loja.whatsapp)}</div>
        <div class="ig">${esc(loja.instagram)}</div>
      </div>
      <div class="rodape"><p>${esc(loja.edicao)}</p><p>${esc(loja.aviso)}</p></div>
    </section>`;
  },
};

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(loja.nome)} · ${esc(loja.edicao)}</title>
<link rel="stylesheet" href="catalogo.css"></head><body>
${paginas.map((pg) => R[pg.tipo](pg)).join('\n')}
<script>
// diminui a fonte dos títulos e nomes que não cabem na largura
(async () => {
  await document.fonts.ready;
  for (const el of document.querySelectorAll('.fit')) {
    const min = +el.dataset.min || 40;
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 1 && size > min) { size -= 2; el.style.fontSize = size + 'px'; }
  }
  window.__pronto = true;
})();
</script>
</body></html>`;
const htmlPath = path.join(ROOT, `catalogo-${VERSAO}.html`);
fs.writeFileSync(htmlPath, html);

// confere se todas as fotos recebidas foram usadas (exceto as repetidas)
const todas = fs.readdirSync(path.join(ROOT, 'fotos-originais')).map((f) => f.slice(0, 3));
const repetidas = new Set(['032', '087']);
const faltando = todas.filter((id) => !usadas.has(id) && !repetidas.has(id));
console.log(`${paginas.length} páginas · ${usadas.size} fotos usadas · ${ref} referências${faltando.length ? ` · FALTANDO: ${faltando.join(', ')}` : ''}`);

// ---------------------------------------------------------------- render
(async () => {
  if (args.has('--html')) return;
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + htmlPath, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__pronto === true, null, { timeout: 120000 });
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  });
  fs.mkdirSync(path.join(ROOT, 'saida'), { recursive: true });
  const nome = VERSAO === 'whatsapp' ? 'Catalogo-mova-action-WhatsApp.pdf' : 'Catalogo-mova-action.pdf';
  await page.pdf({ path: path.join(ROOT, 'saida', nome), preferCSSPageSize: true, printBackground: true });
  console.log('PDF:', path.join('saida', nome));

  if (args.has('--png')) {
    const dir = path.join(ROOT, 'saida', 'previa');
    fs.mkdirSync(dir, { recursive: true });
    await page.emulateMedia({ media: 'print' });
    const els = await page.$$('section.page');
    for (let i = 0; i < els.length; i++) {
      await els[i].screenshot({ path: path.join(dir, `p${String(i + 1).padStart(3, '0')}.png`) });
    }
    console.log('prévias:', els.length);
  }
  await browser.close();
})();
