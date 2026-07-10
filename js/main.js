/* =====================================================================
   INTERFACE / INTERAÇÃO
   ---------------------------------------------------------------------
   Renderiza catálogo, filtros, busca, drawer do carrinho e liga tudo
   ao módulo Cart (cart.js).
   ===================================================================== */
(function () {
  "use strict";

  var cfg = window.CONFIG || {};
  var estado = { categoria: "Todos", busca: "" };
  var tamanhoSelecionado = {}; // { produtoId: tamanho }

  // ---------- Utilidades ----------
  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(txt) {
    return String(txt).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Placeholder de imagem em SVG (data URI). Usado quando o produto
     não tem imagem real definida. Funciona offline. */
  function placeholder(produto) {
    if (produto.imagem) return produto.imagem;
    var cor = produto.cor || "#d6336c";
    var nome = esc(produto.nome);
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + cor + '"/>' +
      '<stop offset="1" stop-color="#6e5162"/></linearGradient></defs>' +
      '<rect width="300" height="400" fill="url(#g)"/>' +
      '<text x="150" y="200" fill="rgba(255,255,255,0.9)" font-family="Poppins,sans-serif" ' +
      'font-size="20" font-weight="700" text-anchor="middle" dominant-baseline="middle">' +
      wrapSvg(nome) + '</text></svg>';
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }
  // Quebra o nome em até 2 linhas no SVG
  function wrapSvg(nome) {
    var palavras = nome.split(" ");
    var meio = Math.ceil(palavras.length / 2);
    var l1 = palavras.slice(0, meio).join(" ");
    var l2 = palavras.slice(meio).join(" ");
    return '<tspan x="150" dy="-0.6em">' + l1 + '</tspan>' +
           (l2 ? '<tspan x="150" dy="1.2em">' + l2 + '</tspan>' : "");
  }

  // ---------- Filtros (chips de categoria) ----------
  function renderFiltros() {
    var wrap = $("#filtros");
    wrap.innerHTML = "";
    var cats = ["Todos"].concat(window.CATEGORIAS || []);
    cats.forEach(function (cat) {
      var b = el("button", "chip" + (estado.categoria === cat ? " is-active" : ""), esc(cat));
      b.addEventListener("click", function () {
        estado.categoria = cat;
        renderFiltros();
        renderGrade();
      });
      wrap.appendChild(b);
    });
  }

  // ---------- Grade de produtos ----------
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
      grade.appendChild(el("div", "vazio", "Nenhum produto encontrado. 😕"));
      return;
    }

    lista.forEach(function (p) {
      var card = el("article", "card");
      var temDesconto = p.precoDe && p.precoDe > p.preco;

      // Imagem
      var img = el("div", "card__img");
      img.innerHTML = '<img src="' + placeholder(p) + '" alt="' + esc(p.nome) + '" loading="lazy" />';
      if (temDesconto) {
        var pct = Math.round((1 - p.preco / p.precoDe) * 100);
        img.appendChild(el("span", "card__tag", "-" + pct + "%"));
      }
      card.appendChild(img);

      // Corpo
      var body = el("div", "card__body");
      body.appendChild(el("div", "card__cat", esc(p.categoria)));
      body.appendChild(el("div", "card__nome", esc(p.nome)));
      body.appendChild(el("div", "card__desc", esc(p.descricao)));

      var precos = el("div", "precos");
      precos.appendChild(el("span", "preco", window.formatarPreco(p.preco)));
      if (temDesconto) precos.appendChild(el("span", "preco-de", window.formatarPreco(p.precoDe)));
      body.appendChild(precos);

      // Tamanhos
      var tamWrap = el("div", "tamanhos");
      p.tamanhos.forEach(function (t, idx) {
        if (tamanhoSelecionado[p.id] == null && idx === 0) tamanhoSelecionado[p.id] = t;
        var tb = el("button", "tam" + (tamanhoSelecionado[p.id] === t ? " is-active" : ""), esc(t));
        tb.addEventListener("click", function () {
          tamanhoSelecionado[p.id] = t;
          tamWrap.querySelectorAll(".tam").forEach(function (x) { x.classList.remove("is-active"); });
          tb.classList.add("is-active");
        });
        tamWrap.appendChild(tb);
      });
      body.appendChild(tamWrap);

      // Botão adicionar
      var add = el("button", "btn btn--primary btn--block", "Adicionar ao carrinho");
      add.addEventListener("click", function () {
        window.Cart.addItem(p.id, tamanhoSelecionado[p.id]);
        toast(p.nome + " adicionado 💗");
      });
      body.appendChild(add);

      card.appendChild(body);
      grade.appendChild(card);
    });
  }

  // ---------- Contador do header ----------
  function atualizarContador() {
    var n = window.Cart.totalItens();
    var badge = $("#contadorCarrinho");
    badge.textContent = n;
    badge.hidden = n === 0;
  }

  // ---------- Drawer do carrinho ----------
  function renderCarrinho() {
    var body = $("#carrinhoItens");
    var foot = $("#carrinhoFoot");
    var itens = window.Cart.detalhado();
    body.innerHTML = "";

    if (itens.length === 0) {
      body.appendChild(el("div", "cart-vazio", "Seu carrinho está vazio.<br>Que tal escolher uma peça? 💪"));
      foot.innerHTML = "";
      return;
    }

    itens.forEach(function (i) {
      var item = el("div", "cart-item");
      item.innerHTML =
        '<div class="cart-item__img"><img src="' + placeholder(i) + '" alt="' + esc(i.nome) + '"></div>';

      var info = el("div", "cart-item__info");
      info.appendChild(el("div", "cart-item__nome", esc(i.nome)));
      info.appendChild(el("div", "cart-item__meta", "Tamanho: " + esc(i.tamanho)));
      info.appendChild(el("div", "cart-item__preco", window.formatarPreco(i.subtotal)));

      var qty = el("div", "qty");
      var menos = el("button", null, "−");
      var span = el("span", null, String(i.qtd));
      var mais = el("button", null, "+");
      menos.addEventListener("click", function () { window.Cart.updateQty(i.id, i.tamanho, -1); });
      mais.addEventListener("click", function () { window.Cart.updateQty(i.id, i.tamanho, 1); });
      qty.appendChild(menos); qty.appendChild(span); qty.appendChild(mais);
      info.appendChild(qty);

      var rm = el("button", "cart-item__rm", "remover");
      rm.addEventListener("click", function () { window.Cart.removeItem(i.id, i.tamanho); });
      info.appendChild(rm);

      item.appendChild(info);
      body.appendChild(item);
    });

    // Rodapé: resumo + frete + checkout
    var total = window.Cart.getTotal();
    foot.innerHTML = "";

    var freeFrom = cfg.freeShippingFrom || 0;
    if (freeFrom > 0) {
      var aviso;
      if (total >= freeFrom) {
        aviso = el("div", "frete-aviso", "🎉 Você ganhou <b>frete grátis</b>!");
      } else {
        var falta = window.formatarPreco(freeFrom - total);
        aviso = el("div", "frete-aviso", "Faltam <b>" + falta + "</b> para o frete grátis.");
      }
      foot.appendChild(aviso);
    }

    var resumo = el("div", "resumo resumo--total");
    resumo.innerHTML = "<span>Total</span><span>" + window.formatarPreco(total) + "</span>";
    foot.appendChild(resumo);

    var btn = el("button", "btn btn--primary btn--block btn--lg",
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20z"/></svg> Finalizar no WhatsApp');
    btn.addEventListener("click", function () {
      var ok = window.Cart.checkout();
      if (ok) toast("Abrindo o WhatsApp... 📱");
    });
    foot.appendChild(btn);
  }

  // ---------- Abrir / fechar drawer ----------
  function abrir() {
    $("#drawer").classList.add("is-open");
    $("#overlay").classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function fechar() {
    $("#drawer").classList.remove("is-open");
    $("#overlay").classList.remove("is-open");
    document.body.style.overflow = "";
  }

  // ---------- Toast ----------
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-show"); }, 2200);
  }

  // ---------- Aplicar config no texto do site ----------
  function aplicarConfig() {
    if (cfg.storeName) {
      $("#footerNome").textContent = cfg.storeName;
      document.title = cfg.storeName + " — Moda Fitness Feminina";
    }
    if (cfg.storeTagline) $("#heroTagline").textContent = cfg.storeTagline;
    if (cfg.instagram) $("#footerInsta").textContent = cfg.instagram;

    var numero = (cfg.whatsappNumber || "").replace(/\D/g, "");
    if (numero) {
      var link = $("#footerWhats");
      link.href = "https://wa.me/" + numero;
      link.textContent = formatarTelefone(numero);
    }
    $("#ano").textContent = new Date().getFullYear();
  }
  // Formata "5585999999999" -> "(85) 99999-9999" (aproximado, para BR)
  function formatarTelefone(num) {
    var n = num.replace(/^55/, "");
    if (n.length >= 10) {
      var ddd = n.slice(0, 2);
      var resto = n.slice(2);
      var meio = resto.length > 8 ? 5 : 4;
      return "(" + ddd + ") " + resto.slice(0, meio) + "-" + resto.slice(meio);
    }
    return num;
  }

  // ---------- Inicialização ----------
  function init() {
    aplicarConfig();
    renderFiltros();
    renderGrade();

    // Busca
    $("#busca").addEventListener("input", function (e) {
      estado.busca = e.target.value;
      renderGrade();
    });

    // Carrinho: reagir a mudanças
    window.Cart.onChange = function () {
      atualizarContador();
      renderCarrinho();
    };
    atualizarContador();
    renderCarrinho();

    // Abrir/fechar drawer
    $("#abrirCarrinho").addEventListener("click", abrir);
    $("#fecharCarrinho").addEventListener("click", fechar);
    $("#overlay").addEventListener("click", fechar);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") fechar();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
