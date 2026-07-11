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

  function renderGrade() {
    var grade = $("#grade");
    grade.innerHTML = "";
    var lista = produtosFiltrados();
    if (lista.length === 0) {
      grade.appendChild(el("div", "vazio", "Nada por aqui ainda…"));
      return;
    }

    lista.forEach(function (p) {
      var temDesc = p.precoDe && p.precoDe > p.preco;
      var art = el("article", "prod");

      var media = el("div", "prod__media");
      if (temDesc) {
        var pct = Math.round((1 - p.preco / p.precoDe) * 100);
        media.appendChild(el("span", "prod__flag", "-" + pct + "%"));
      }
      media.innerHTML += '<img src="' + placeholder(p) + '" alt="' + esc(p.nome) + '" loading="lazy" />';
      var add = el("button", "prod__add", "Adicionar");
      add.addEventListener("click", function () {
        window.Cart.addItem(p.id, tamanhoSelecionado[p.id]);
        toast(p.nome + " adicionado à sacola");
      });
      media.appendChild(add);
      art.appendChild(media);

      art.appendChild(el("div", "prod__cat", esc(p.categoria)));
      art.appendChild(el("div", "prod__name", esc(p.nome)));

      var price = el("div", "prod__price");
      price.appendChild(el("b", null, window.formatarPreco(p.preco)));
      if (temDesc) price.appendChild(el("s", null, window.formatarPreco(p.precoDe)));
      art.appendChild(price);

      var sizes = el("div", "prod__sizes");
      p.tamanhos.forEach(function (t, i) {
        if (tamanhoSelecionado[p.id] == null && i === 0) tamanhoSelecionado[p.id] = t;
        var tb = el("button", tamanhoSelecionado[p.id] === t ? "is-active" : null, esc(t));
        tb.addEventListener("click", function () {
          tamanhoSelecionado[p.id] = t;
          sizes.querySelectorAll("button").forEach(function (x) { x.classList.remove("is-active"); });
          tb.classList.add("is-active");
        });
        sizes.appendChild(tb);
      });
      art.appendChild(sizes);

      grade.appendChild(art);
    });
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
