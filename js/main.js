/* =====================================================================
   INTERFACE / INTERAÇÃO — mova.
   ---------------------------------------------------------------------
   Renderiza categorias, catálogo, filtros, busca, sacola (drawer) e
   liga tudo ao módulo Cart (cart.js).
   ===================================================================== */
(function () {
  "use strict";

  var cfg = window.CONFIG || {};
  var estado = { categoria: "Todos", busca: "" };
  var tamanhoSelecionado = {}; // { produtoId: tamanho }

  // ---------- Utilidades ----------
  function $(s) { return document.querySelector(s); }
  function $all(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Placeholder de produto (SVG data URI) — gradiente mauve + nome.
     Usado quando o produto não tem imagem real. Funciona offline. */
  function placeholder(produto) {
    if (produto.imagem) return produto.imagem;
    var cor = produto.cor || "#8b687e";
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="450" height="600" viewBox="0 0 450 600">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + cor + '"/>' +
      '<stop offset="1" stop-color="#6e5162"/></linearGradient></defs>' +
      '<rect width="450" height="600" fill="url(#g)"/>' +
      '<text x="225" y="310" fill="rgba(255,255,255,0.92)" font-family="Georgia, serif" ' +
      'font-style="italic" font-size="26" text-anchor="middle">' + wrap(esc(produto.nome)) + '</text>' +
      '</svg>';
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }
  function wrap(nome) {
    var p = nome.split(" "), meio = Math.ceil(p.length / 2);
    var l1 = p.slice(0, meio).join(" "), l2 = p.slice(meio).join(" ");
    return '<tspan x="225" dy="-0.6em">' + l1 + '</tspan>' + (l2 ? '<tspan x="225" dy="1.2em">' + l2 + '</tspan>' : "");
  }

  /* Fundo (gradiente, sem texto) para os tiles editoriais de categoria. */
  function catBg(cat) {
    var prod = (window.PRODUTOS || []).filter(function (p) { return p.categoria === cat; })[0];
    var cor = (prod && prod.cor) || "#8b687e";
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">' +
      '<defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + cor + '"/>' +
      '<stop offset="1" stop-color="#3d2e37"/></linearGradient></defs>' +
      '<rect width="600" height="800" fill="url(#c)"/></svg>';
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  // ---------- Categorias (tiles editoriais) ----------
  function selecionarCategoria(cat) {
    estado.categoria = cat;
    renderFiltros();
    renderGrade();
    var alvo = document.getElementById("loja");
    if (alvo) alvo.scrollIntoView({ behavior: "smooth" });
  }

  function renderCats() {
    var wrap = $("#cats");
    if (!wrap) return;
    // destaca as 3 categorias principais de vestuário
    var principais = ["Leggings", "Tops", "Conjuntos"].filter(function (c) {
      return (window.CATEGORIAS || []).indexOf(c) !== -1;
    });
    wrap.innerHTML = "";
    principais.forEach(function (cat) {
      var a = el("a", "cat");
      a.href = "#loja";
      a.innerHTML =
        '<div class="cat__bg" style="background:center/cover url(\'' + catBg(cat) + '\')"></div>' +
        '<div class="cat__label"><h3>' + esc(cat) + '</h3>' +
        '<span>Ver tudo →</span></div>';
      a.addEventListener("click", function (e) { e.preventDefault(); selecionarCategoria(cat); });
      wrap.appendChild(a);
    });
  }

  // ---------- Filtros ----------
  function renderFiltros() {
    var wrap = $("#filtros");
    wrap.innerHTML = "";
    ["Todos"].concat(window.CATEGORIAS || []).forEach(function (cat) {
      var b = el("button", "chip" + (estado.categoria === cat ? " is-active" : ""), esc(cat));
      b.addEventListener("click", function () { estado.categoria = cat; renderFiltros(); renderGrade(); });
      wrap.appendChild(b);
    });
  }

  // ---------- Catálogo ----------
  function produtosFiltrados() {
    var termo = estado.busca.trim().toLowerCase();
    return (window.PRODUTOS || []).filter(function (p) {
      var okCat = estado.categoria === "Todos" || p.categoria === estado.categoria;
      var okBusca = !termo || p.nome.toLowerCase().indexOf(termo) !== -1;
      return okCat && okBusca;
    });
  }

  function byId(id) {
    return (window.PRODUTOS || []).filter(function (p) { return p.id === id; })[0];
  }

  /* HTML de um card de produto (usa data-attrs; cliques via delegação). */
  function cardHTML(p) {
    var temDesc = p.precoDe && p.precoDe > p.preco;
    var pct = temDesc ? Math.round((1 - p.preco / p.precoDe) * 100) : 0;
    if (tamanhoSelecionado[p.id] == null) tamanhoSelecionado[p.id] = p.tamanhos[0];
    var sizes = p.tamanhos.map(function (t) {
      return '<button type="button" data-id="' + p.id + '" data-size="' + esc(t) + '"' +
        (tamanhoSelecionado[p.id] === t ? ' class="is-active"' : '') + '>' + esc(t) + '</button>';
    }).join("");
    return '<article class="prod">' +
      '<div class="prod__media">' +
        (temDesc ? '<span class="prod__flag">-' + pct + '%</span>' : '') +
        '<img src="' + placeholder(p) + '" alt="' + esc(p.nome) + '" loading="lazy" draggable="false" />' +
        '<button type="button" class="prod__add" data-id="' + p.id + '">Adicionar</button>' +
      '</div>' +
      '<div class="prod__cat">' + esc(p.categoria) + '</div>' +
      '<div class="prod__name">' + esc(p.nome) + '</div>' +
      '<div class="prod__price"><b>' + window.formatarPreco(p.preco) + '</b>' +
        (temDesc ? '<s>' + window.formatarPreco(p.precoDe) + '</s>' : '') + '</div>' +
      '<div class="prod__sizes">' + sizes + '</div>' +
    '</article>';
  }

  function renderGrade() {
    var track = $("#grade");
    carouselStop();
    var lista = produtosFiltrados();
    if (lista.length === 0) {
      track.innerHTML = '<div class="vazio">Nada por aqui ainda…</div>';
      return;
    }
    track.innerHTML = lista.map(cardHTML).join("");
    // configura o auto-scroll depois do layout medir as larguras
    requestAnimationFrame(setupCarousel);
  }

  // ---------- Carrossel (auto-scroll contínuo) ----------
  var carRAF = null, carPaused = false, carLoop = 0, carPos = 0, nudgeTimer = null;

  function carouselStop() {
    if (carRAF) { cancelAnimationFrame(carRAF); carRAF = null; }
    carLoop = 0; carPos = 0;
  }

  function setupCarousel() {
    var vp = $("#carViewport"), track = $("#grade");
    if (!vp || !track) return;
    // se o conteúdo cabe na tela, não precisa rodar
    if (track.scrollWidth <= vp.clientWidth + 4) { carLoop = 0; return; }
    // duplica o conjunto para um loop contínuo e sem emenda
    track.innerHTML = track.innerHTML + track.innerHTML;
    carLoop = track.scrollWidth / 2;
    vp.scrollLeft = 0; carPos = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var speed = 0.6; // acumulado por frame; ~36px/s
    (function step() {
      if (!carPaused && carLoop > 0) {
        // scrollLeft é inteiro: acumula em float e soma pixels inteiros
        carPos += speed;
        if (carPos >= 1) {
          var d = Math.floor(carPos);
          vp.scrollLeft += d;
          carPos -= d;
          if (vp.scrollLeft >= carLoop) vp.scrollLeft -= carLoop;
        }
      }
      carRAF = requestAnimationFrame(step);
    })();
  }

  function nudge(dir) {
    var vp = $("#carViewport");
    var card = vp.querySelector(".prod");
    var w = card ? card.getBoundingClientRect().width + 18 : 240;
    carPaused = true;
    vp.scrollBy({ left: dir * w, behavior: "smooth" });
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(function () { carPaused = false; }, 1200);
  }

  // ---------- Contador ----------
  function atualizarContador() {
    var n = window.Cart.totalItens();
    var b = $("#contadorCarrinho");
    b.textContent = n;
    b.hidden = n === 0;
  }

  // ---------- Sacola (drawer) ----------
  function renderCarrinho() {
    var body = $("#carrinhoItens");
    var foot = $("#carrinhoFoot");
    var itens = window.Cart.detalhado();
    body.innerHTML = "";

    if (itens.length === 0) {
      body.appendChild(el("div", "cart-empty", "Sua sacola está vazia."));
      foot.innerHTML = "";
      return;
    }

    itens.forEach(function (i) {
      var it = el("div", "citem");
      it.innerHTML = '<div class="citem__img"><img src="' + placeholder(i) + '" alt="' + esc(i.nome) + '"></div>';
      var info = el("div", "citem__info");
      info.appendChild(el("div", "citem__name", esc(i.nome)));
      info.appendChild(el("div", "citem__meta", "Tam " + esc(i.tamanho)));
      info.appendChild(el("div", "citem__price", window.formatarPreco(i.subtotal)));

      var qty = el("div", "qty");
      var menos = el("button", null, "−"), span = el("span", null, String(i.qtd)), mais = el("button", null, "+");
      menos.addEventListener("click", function () { window.Cart.updateQty(i.id, i.tamanho, -1); });
      mais.addEventListener("click", function () { window.Cart.updateQty(i.id, i.tamanho, 1); });
      qty.appendChild(menos); qty.appendChild(span); qty.appendChild(mais);
      info.appendChild(qty);

      var rm = el("button", "citem__rm", "remover");
      rm.addEventListener("click", function () { window.Cart.removeItem(i.id, i.tamanho); });
      info.appendChild(rm);

      it.appendChild(info);
      body.appendChild(it);
    });

    var total = window.Cart.getTotal();
    foot.innerHTML = "";
    var freeFrom = cfg.freeShippingFrom || 0;
    if (freeFrom > 0) {
      foot.appendChild(
        total >= freeFrom
          ? el("div", "frete", "🎉 Você ganhou <b>frete grátis</b>!")
          : el("div", "frete", "Faltam <b>" + window.formatarPreco(freeFrom - total) + "</b> para o frete grátis.")
      );
    }
    var row = el("div", "rowtotal");
    row.innerHTML = "<span>Total</span><span>" + window.formatarPreco(total) + "</span>";
    foot.appendChild(row);

    var btn = el("button", "btn btn--solid btn--block", "Finalizar no WhatsApp");
    btn.addEventListener("click", function () { if (window.Cart.checkout()) toast("Abrindo o WhatsApp…"); });
    foot.appendChild(btn);
  }

  // ---------- Drawer ----------
  function abrir() { $("#drawer").classList.add("is-open"); $("#overlay").classList.add("is-open"); document.body.style.overflow = "hidden"; }
  function fechar() { $("#drawer").classList.remove("is-open"); $("#overlay").classList.remove("is-open"); document.body.style.overflow = ""; }

  // ---------- Toast ----------
  var tt;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(tt);
    tt = setTimeout(function () { t.classList.remove("is-show"); }, 2200);
  }

  // ---------- Config → textos ----------
  function aplicarConfig() {
    if (cfg.storeName) document.title = cfg.storeName + " — Moda Fitness Feminina";
    if (cfg.storeTagline) { var hs = $("#heroSub"); if (hs) hs.textContent = cfg.storeTagline; }
    if (cfg.instagram) {
      var fi = $("#footerInsta");
      if (fi) { fi.textContent = "Instagram " + cfg.instagram; fi.href = "https://instagram.com/" + cfg.instagram.replace(/^@/, ""); }
    }
    var numero = (cfg.whatsappNumber || "").replace(/\D/g, "");
    if (numero) { var fw = $("#footerWhats"); if (fw) fw.href = "https://wa.me/" + numero; }
    var ano = $("#ano"); if (ano) ano.textContent = new Date().getFullYear();
  }

  // ---------- Init ----------
  function init() {
    aplicarConfig();
    renderCats();
    renderFiltros();
    renderGrade();

    $("#busca").addEventListener("input", function (e) { estado.busca = e.target.value; renderGrade(); });

    // Cliques nos cards (delegação — funciona também nas cópias do carrossel)
    $("#grade").addEventListener("click", function (e) {
      var add = e.target.closest(".prod__add");
      if (add) {
        var id = parseInt(add.dataset.id, 10);
        var p = byId(id);
        window.Cart.addItem(id, tamanhoSelecionado[id]);
        if (p) toast(p.nome + " adicionado à sacola");
        return;
      }
      var sb = e.target.closest(".prod__sizes button");
      if (sb) {
        var pid = parseInt(sb.dataset.id, 10);
        var size = sb.dataset.size;
        tamanhoSelecionado[pid] = size;
        $all('#grade .prod__sizes button[data-id="' + pid + '"]').forEach(function (b) {
          b.classList.toggle("is-active", b.dataset.size === size);
        });
      }
    });

    // Carrossel: pausa ao interagir; setas ‹ ›
    var car = $("#carousel");
    if (car) {
      ["mouseenter", "touchstart", "focusin"].forEach(function (ev) {
        car.addEventListener(ev, function () { carPaused = true; }, { passive: true });
      });
      ["mouseleave", "touchend", "focusout"].forEach(function (ev) {
        car.addEventListener(ev, function () { carPaused = false; }, { passive: true });
      });
      $("#carPrev").addEventListener("click", function () { nudge(-1); });
      $("#carNext").addEventListener("click", function () { nudge(1); });
    }
    // recalcula o loop se a janela mudar de tamanho
    var rz;
    window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(renderGrade, 250); });

    window.Cart.onChange = function () { atualizarContador(); renderCarrinho(); };
    atualizarContador();
    renderCarrinho();

    $("#abrirCarrinho").addEventListener("click", abrir);
    $("#fecharCarrinho").addEventListener("click", fechar);
    $("#overlay").addEventListener("click", fechar);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fechar(); });

    // Navegação por categoria (header)
    $all("#mainnav a[data-cat]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); selecionarCategoria(a.getAttribute("data-cat")); });
    });

    // Newsletter (apenas confirmação visual)
    var nf = $("#newsForm");
    if (nf) nf.addEventListener("submit", function (e) { e.preventDefault(); nf.reset(); toast("Inscrição confirmada 💌"); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
