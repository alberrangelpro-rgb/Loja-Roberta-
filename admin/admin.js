/* =====================================================================
   mova. gestão — Estoque & Financeiro
   ---------------------------------------------------------------------
   Aplicação de página única (SPA) em JavaScript puro.
   Todos os dados ficam salvos no navegador (localStorage) — sem servidor.
   Faça backup pela aba "Backup" para não perder as informações.
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   *  CHAVES E ESTADO
   * ------------------------------------------------------------------ */
  var DB_KEY = "mova_admin_db_v1";
  var AUTH_KEY = "mova_admin_auth_v1";

  var DEFAULT_DB = {
    produtos: [],
    movimentacoes: [],   // { id, produtoId, tipo:'entrada'|'saida'|'ajuste', qtd, motivo, data }
    lancamentos: [],     // { id, data, tipo:'receita'|'despesa', categoria, descricao, valor, custo, produtoId, qtd, pagamento }
    categoriasProduto: ["Leggings", "Tops", "Conjuntos", "Shorts", "Regatas", "Acessórios"],
    categoriasDespesa: ["Compra de mercadoria", "Aluguel", "Marketing", "Embalagem", "Frete", "Taxas", "Salário", "Outros"],
    pagamentos: ["Pix", "Dinheiro", "Cartão débito", "Cartão crédito", "Outro"],
  };

  /* ------------------------------------------------------------------ *
   *  ARMAZENAMENTO SEGURO
   *  Alguns navegadores (Safari abrindo arquivo local, aba anônima)
   *  BLOQUEIAM o localStorage e fazem setItem lançar erro. Sem tratar,
   *  isso trava telas inteiras (ex.: o botão de criar senha). Aqui há
   *  um teste de disponibilidade e um espelho em memória de fallback,
   *  para o sistema nunca quebrar — apenas avisar que não vai salvar.
   * ------------------------------------------------------------------ */
  var mem = {};
  var canPersist = false;
  (function () {
    try {
      var t = "__mova_test__";
      localStorage.setItem(t, "1");
      localStorage.removeItem(t);
      canPersist = true;
    } catch (e) { canPersist = false; }
  })();
  function storeGet(k) {
    try { if (canPersist) return localStorage.getItem(k); } catch (e) {}
    return k in mem ? mem[k] : null;
  }
  function storeSet(k, v) {
    try { if (canPersist) { localStorage.setItem(k, v); return true; } } catch (e) { canPersist = false; }
    mem[k] = v; return false;
  }

  var DB = load();
  var currentView = "dashboard";

  /* ------------------------------------------------------------------ *
   *  PERSISTÊNCIA
   * ------------------------------------------------------------------ */
  function load() {
    try {
      var raw = storeGet(DB_KEY);
      if (!raw) return clone(DEFAULT_DB);
      var data = JSON.parse(raw);
      // completa chaves que possam faltar de versões antigas
      Object.keys(DEFAULT_DB).forEach(function (k) {
        if (data[k] == null) data[k] = clone(DEFAULT_DB[k]);
      });
      return data;
    } catch (e) {
      return clone(DEFAULT_DB);
    }
  }
  function save() {
    var ok = storeSet(DB_KEY, JSON.stringify(DB));
    if (!ok) return; // modo memória: já avisado por banner; não incomoda a cada ação
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ------------------------------------------------------------------ *
   *  UTILITÁRIOS
   * ------------------------------------------------------------------ */
  var moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function money(n) { return moneyFmt.format(Number(n) || 0); }
  function num(n) { return (Number(n) || 0).toLocaleString("pt-BR"); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function monthKey(iso) { return (iso || todayISO()).slice(0, 7); }
  function currentMonth() { return todayISO().slice(0, 7); }
  function dateBR(iso) {
    if (!iso) return "—";
    var p = iso.slice(0, 10).split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  function monthLabel(mk) {
    var meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    var p = mk.split("-");
    return meses[Number(p[1]) - 1] + "/" + p[0];
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(html) {
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }
  function toNumber(v) {
    if (typeof v === "number") return v;
    if (v == null || v === "") return 0;
    var s = String(v).trim();
    if (s.indexOf(",") >= 0) {
      // formato brasileiro digitado: "1.399,90" -> ponto é milhar, vírgula é decimal
      s = s.replace(/\./g, "").replace(",", ".");
    }
    // sem vírgula: o ponto (se houver) é o separador decimal — mantém
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  function produtoById(id) {
    for (var i = 0; i < DB.produtos.length; i++) if (DB.produtos[i].id === id) return DB.produtos[i];
    return null;
  }

  /* ------------------------------------------------------------------ *
   *  TOAST
   * ------------------------------------------------------------------ */
  var toastTimer;
  function toast(msg, kind) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.className = "toast" + (kind ? " " + kind : "");
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ------------------------------------------------------------------ *
   *  MODAL
   * ------------------------------------------------------------------ */
  function openModal(title, bodyHTML, onMount) {
    document.getElementById("modalTitle").textContent = title;
    var body = document.getElementById("modalBody");
    body.innerHTML = bodyHTML;
    document.getElementById("modalBackdrop").hidden = false;
    if (onMount) onMount(body);
  }
  function closeModal() { document.getElementById("modalBackdrop").hidden = true; }

  /* ------------------------------------------------------------------ *
   *  AUTENTICAÇÃO (trava local simples — não é criptografia)
   * ------------------------------------------------------------------ */
  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return "h" + h.toString(16);
  }
  function hasPassword() { return !!storeGet(AUTH_KEY); }

  function setupLock() {
    var screen = document.getElementById("lockScreen");
    var pass = document.getElementById("lockPass");
    var btn = document.getElementById("lockBtn");
    var hint = document.getElementById("lockHint");
    var err = document.getElementById("lockError");

    function refresh() {
      if (hasPassword()) {
        hint.textContent = "Digite sua senha para acessar o painel.";
        btn.textContent = "Entrar";
      } else {
        hint.textContent = "Primeiro acesso: defina uma senha para proteger o painel.";
        btn.textContent = "Criar senha e entrar";
      }
      if (!canPersist) {
        err.hidden = false;
        err.style.color = "var(--amber)";
        err.innerHTML = "⚠️ Este navegador está com o armazenamento bloqueado — o painel abre e funciona, mas <b>os dados não serão salvos ao fechar</b>.";
      }
    }
    refresh();

    function submit() {
      var v = pass.value.trim();
      err.hidden = true;
      if (v.length < 4) { err.textContent = "Use pelo menos 4 caracteres."; err.hidden = false; return; }
      if (!hasPassword()) {
        storeSet(AUTH_KEY, hash(v));
        unlock();
      } else if (storeGet(AUTH_KEY) === hash(v)) {
        unlock();
      } else {
        err.textContent = "Senha incorreta."; err.hidden = false;
      }
    }
    function unlock() {
      screen.hidden = true;
      document.getElementById("app").hidden = false;
      pass.value = "";
      render();
    }
    btn.addEventListener("click", submit);
    pass.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });

    document.getElementById("btnLock").addEventListener("click", function () {
      document.getElementById("app").hidden = true;
      screen.hidden = false;
      refresh();
      pass.focus();
    });
  }

  /* ------------------------------------------------------------------ *
   *  CÁLCULOS FINANCEIROS
   * ------------------------------------------------------------------ */
  function filtroMes(arr, mk) {
    if (!mk) return arr;
    return arr.filter(function (l) { return monthKey(l.data) === mk; });
  }
  function somaReceita(arr) { return arr.filter(function (l) { return l.tipo === "receita"; }).reduce(function (s, l) { return s + Number(l.valor || 0); }, 0); }
  function somaDespesa(arr) { return arr.filter(function (l) { return l.tipo === "despesa"; }).reduce(function (s, l) { return s + Number(l.valor || 0); }, 0); }
  function somaCMV(arr) { return arr.filter(function (l) { return l.tipo === "receita"; }).reduce(function (s, l) { return s + Number(l.custo || 0); }, 0); }
  function saldoCaixa() { return somaReceita(DB.lancamentos) - somaDespesa(DB.lancamentos); }
  function valorEstoqueCusto() { return DB.produtos.reduce(function (s, p) { return s + Number(p.custo || 0) * Number(p.estoque || 0); }, 0); }
  function valorEstoqueVenda() { return DB.produtos.reduce(function (s, p) { return s + Number(p.preco || 0) * Number(p.estoque || 0); }, 0); }
  function produtosBaixos() { return DB.produtos.filter(function (p) { return Number(p.estoque || 0) <= Number(p.estoqueMin || 0); }); }

  /* ------------------------------------------------------------------ *
   *  MOVIMENTAÇÃO DE ESTOQUE
   * ------------------------------------------------------------------ */
  function moverEstoque(produtoId, tipo, qtd, motivo, data) {
    var p = produtoById(produtoId);
    if (!p) return;
    qtd = Math.abs(Number(qtd) || 0);
    if (tipo === "entrada") p.estoque = Number(p.estoque || 0) + qtd;
    else if (tipo === "saida") p.estoque = Math.max(0, Number(p.estoque || 0) - qtd);
    else if (tipo === "ajuste") p.estoque = qtd; // define diretamente
    DB.movimentacoes.push({
      id: uid(), produtoId: produtoId, tipo: tipo, qtd: qtd,
      motivo: motivo || "", data: data || todayISO(),
    });
  }

  /* ================================================================== *
   *  VIEW: DASHBOARD
   * ================================================================== */
  function viewDashboard() {
    var mk = currentMonth();
    var doMes = filtroMes(DB.lancamentos, mk);
    var fat = somaReceita(doMes);
    var desp = somaDespesa(doMes);
    var cmv = somaCMV(doMes);
    var lucro = fat - cmv - desp;
    var baixos = produtosBaixos();

    // top produtos vendidos no mês
    var vendasMes = doMes.filter(function (l) { return l.tipo === "receita" && l.produtoId; });
    var porProd = {};
    vendasMes.forEach(function (l) {
      if (!porProd[l.produtoId]) porProd[l.produtoId] = { qtd: 0, total: 0 };
      porProd[l.produtoId].qtd += Number(l.qtd || 0);
      porProd[l.produtoId].total += Number(l.valor || 0);
    });
    var top = Object.keys(porProd).map(function (id) {
      var p = produtoById(id);
      return { nome: p ? p.nome : "(removido)", qtd: porProd[id].qtd, total: porProd[id].total };
    }).sort(function (a, b) { return b.total - a.total; }).slice(0, 5);
    var maxTop = top.reduce(function (m, t) { return Math.max(m, t.total); }, 0) || 1;

    var html = "";
    html += pageHead("Painel", "Resumo de " + monthLabel(mk) + ". Bem-vinda de volta 💪");

    if (baixos.length) {
      html += '<div class="alert alert-amber"><span>⚠️</span><div><b>' + baixos.length +
        (baixos.length === 1 ? " produto</b> está" : " produtos</b> estão") +
        ' com estoque baixo ou zerado. <a href="#" data-goto="estoque" class="muted" style="text-decoration:underline">Ver estoque</a></div></div>';
    }

    html += '<div class="kpi-grid">';
    html += kpi("Faturamento do mês", money(fat), num(vendasMes.length) + " venda(s)");
    html += kpi("Despesas do mês", money(desp), "", "neg");
    html += kpi("Lucro do mês", money(lucro), "faturam. − custo − despesas", lucro >= 0 ? "pos" : "neg");
    html += kpi("Saldo em caixa", money(saldoCaixa()), "acumulado (entradas − saídas)", saldoCaixa() >= 0 ? "" : "neg");
    html += "</div>";

    html += '<div class="kpi-grid">';
    html += kpi("Produtos cadastrados", num(DB.produtos.length), "");
    html += kpi("Peças em estoque", num(DB.produtos.reduce(function (s, p) { return s + Number(p.estoque || 0); }, 0)), "");
    html += kpi("Valor do estoque (custo)", money(valorEstoqueCusto()), "");
    html += kpi("Valor do estoque (venda)", money(valorEstoqueVenda()), "");
    html += "</div>";

    html += '<div class="two-col">';

    // Top produtos
    html += '<div class="card"><div class="card-head"><h3>Mais vendidos no mês</h3></div><div class="card-body">';
    if (top.length) {
      html += '<div class="bar-list">';
      top.forEach(function (t) {
        html += '<div class="bar-row"><div class="name" title="' + esc(t.nome) + '">' + esc(t.nome) +
          '</div><div class="bar-track"><div class="bar-fill" style="width:' + Math.max(6, (t.total / maxTop * 100)) + '%"></div></div>' +
          '<div class="val">' + money(t.total) + " · " + num(t.qtd) + "un</div></div>";
      });
      html += "</div>";
    } else {
      html += emptyBox("📊", "Nenhuma venda neste mês ainda.", "Registre vendas na aba Vendas.");
    }
    html += "</div></div>";

    // Estoque baixo
    html += '<div class="card"><div class="card-head"><h3>Estoque baixo</h3></div><div class="card-body flush">';
    if (baixos.length) {
      html += '<div class="table-wrap"><table><tbody>';
      baixos.slice(0, 8).forEach(function (p) {
        html += "<tr><td><div class='cell-name'>" + esc(p.nome) + "</div><div class='cell-sub'>" + esc(p.categoria || "") +
          "</div></td><td class='num'>" + estoqueBadge(p) + "</td></tr>";
      });
      html += "</tbody></table></div>";
    } else {
      html += emptyBox("✅", "Nenhum produto em falta.", "Tudo dentro do estoque mínimo.");
    }
    html += "</div></div>";

    html += "</div>"; // two-col
    return html;
  }

  /* ================================================================== *
   *  VIEW: ESTOQUE
   * ================================================================== */
  var estoqueFiltro = { busca: "", categoria: "", status: "" };

  function viewEstoque() {
    var html = pageHead("Estoque", "Cadastre e controle seus produtos.",
      '<button class="btn btn-outline" data-action="mov-rapida">Entrada/Saída</button>' +
      '<button class="btn btn-primary" data-action="novo-produto">+ Novo produto</button>');

    // toolbar
    html += '<div class="toolbar">';
    html += '<div class="search"><input class="input" id="fBusca" placeholder="Buscar por nome ou código…" value="' + esc(estoqueFiltro.busca) + '"></div>';
    html += '<select class="select" id="fCat" style="max-width:180px"><option value="">Todas as categorias</option>' +
      DB.categoriasProduto.map(function (c) { return '<option ' + (estoqueFiltro.categoria === c ? "selected" : "") + '>' + esc(c) + "</option>"; }).join("") + "</select>";
    html += '<select class="select" id="fStatus" style="max-width:170px">' +
      ['<option value="">Todo estoque</option>',
       '<option value="baixo"' + (estoqueFiltro.status === "baixo" ? " selected" : "") + '>Estoque baixo</option>',
       '<option value="zerado"' + (estoqueFiltro.status === "zerado" ? " selected" : "") + '>Zerados</option>'].join("") + "</select>";
    html += "</div>";

    var lista = DB.produtos.filter(function (p) {
      if (estoqueFiltro.categoria && p.categoria !== estoqueFiltro.categoria) return false;
      if (estoqueFiltro.status === "baixo" && Number(p.estoque || 0) > Number(p.estoqueMin || 0)) return false;
      if (estoqueFiltro.status === "zerado" && Number(p.estoque || 0) > 0) return false;
      if (estoqueFiltro.busca) {
        var q = estoqueFiltro.busca.toLowerCase();
        if ((p.nome || "").toLowerCase().indexOf(q) < 0 && (p.sku || "").toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });

    html += '<div class="card"><div class="card-body flush">';
    if (!DB.produtos.length) {
      html += emptyBox("📦", "Nenhum produto cadastrado ainda.", 'Clique em "+ Novo produto" para começar.');
    } else if (!lista.length) {
      html += emptyBox("🔎", "Nada encontrado com esses filtros.", "");
    } else {
      html += '<div class="table-wrap"><table><thead><tr>' +
        "<th>Produto</th><th>Categoria</th><th class='num'>Custo</th><th class='num'>Venda</th><th class='num'>Margem</th><th class='num'>Estoque</th><th></th>" +
        "</tr></thead><tbody>";
      lista.forEach(function (p) {
        var margem = Number(p.preco || 0) - Number(p.custo || 0);
        var margPct = p.custo > 0 ? Math.round(margem / p.custo * 100) : (p.preco > 0 ? 100 : 0);
        html += "<tr>" +
          "<td><div class='cell-name'>" + esc(p.nome) + "</div><div class='cell-sub'>" + (p.sku ? "Cód: " + esc(p.sku) : "") + (p.tamanhos ? (p.sku ? " · " : "") + esc(p.tamanhos) : "") + "</div></td>" +
          "<td><span class='badge badge-mauve'>" + esc(p.categoria || "—") + "</span></td>" +
          "<td class='num'>" + money(p.custo) + "</td>" +
          "<td class='num'>" + money(p.preco) + "</td>" +
          "<td class='num'>" + money(margem) + "<div class='cell-sub'>" + margPct + "%</div></td>" +
          "<td class='num'>" + estoqueBadge(p) + "</td>" +
          "<td><div class='row-actions'>" +
          "<button class='icon-btn' data-edit='" + p.id + "' title='Editar'>✎</button>" +
          "<button class='icon-btn' data-hist='" + p.id + "' title='Movimentações'>↕</button>" +
          "<button class='icon-btn danger' data-del='" + p.id + "' title='Excluir'>🗑</button>" +
          "</div></td></tr>";
      });
      html += "</tbody></table></div>";
    }
    html += "</div></div>";
    return html;
  }

  function estoqueBadge(p) {
    var e = Number(p.estoque || 0), min = Number(p.estoqueMin || 0);
    var cls = "badge-green", txt = num(e) + " un";
    if (e <= 0) { cls = "badge-red"; }
    else if (e <= min) { cls = "badge-amber"; }
    return "<span class='badge " + cls + "'>" + txt + "</span>";
  }

  function formProduto(p) {
    p = p || {};
    var cats = DB.categoriasProduto.map(function (c) {
      return '<option ' + (p.categoria === c ? "selected" : "") + ">" + esc(c) + "</option>";
    }).join("");
    return '' +
      '<form id="formProduto">' +
        '<div class="field"><span>Nome do produto *</span><input class="input" name="nome" required value="' + esc(p.nome || "") + '" placeholder="Ex.: Legging Power Cintura Alta"></div>' +
        '<div class="field-row">' +
          '<div class="field"><span>Código / SKU <span class="hint">(opcional)</span></span><input class="input" name="sku" value="' + esc(p.sku || "") + '" placeholder="Ex.: LEG-001"></div>' +
          '<div class="field"><span>Categoria</span><select class="select" name="categoria"><option value="">—</option>' + cats + "</select></div>" +
        "</div>" +
        '<div class="field-row">' +
          '<div class="field"><span>Preço de custo (R$)</span><input class="input" name="custo" inputmode="decimal" value="' + (p.custo != null ? p.custo : "") + '" placeholder="0,00"></div>' +
          '<div class="field"><span>Preço de venda (R$) *</span><input class="input" name="preco" inputmode="decimal" required value="' + (p.preco != null ? p.preco : "") + '" placeholder="0,00"></div>' +
        "</div>" +
        '<div class="field-row">' +
          '<div class="field"><span>Estoque atual</span><input class="input" name="estoque" inputmode="numeric" value="' + (p.estoque != null ? p.estoque : "0") + '"></div>' +
          '<div class="field"><span>Estoque mínimo <span class="hint">(alerta)</span></span><input class="input" name="estoqueMin" inputmode="numeric" value="' + (p.estoqueMin != null ? p.estoqueMin : "2") + '"></div>' +
        "</div>" +
        '<div class="field"><span>Tamanhos / variações <span class="hint">(texto livre, opcional)</span></span><input class="input" name="tamanhos" value="' + esc(p.tamanhos || "") + '" placeholder="Ex.: P, M, G, GG"></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-outline" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Salvar produto</button></div>' +
      "</form>";
  }

  function abrirFormProduto(p) {
    openModal(p ? "Editar produto" : "Novo produto", formProduto(p), function (body) {
      var form = body.querySelector("#formProduto");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var f = new FormData(form);
        var nome = (f.get("nome") || "").trim();
        if (!nome) return;
        var data = {
          nome: nome,
          sku: (f.get("sku") || "").trim(),
          categoria: f.get("categoria") || "",
          custo: toNumber(f.get("custo")),
          preco: toNumber(f.get("preco")),
          estoque: Math.round(toNumber(f.get("estoque"))),
          estoqueMin: Math.round(toNumber(f.get("estoqueMin"))),
          tamanhos: (f.get("tamanhos") || "").trim(),
        };
        if (p) {
          Object.assign(p, data);
          toast("Produto atualizado.", "ok");
        } else {
          data.id = uid();
          data.criadoEm = todayISO();
          DB.produtos.unshift(data);
          toast("Produto cadastrado.", "ok");
        }
        save();
        closeModal();
        render();
      });
    });
  }

  function abrirHistorico(id) {
    var p = produtoById(id);
    if (!p) return;
    var movs = DB.movimentacoes.filter(function (m) { return m.produtoId === id; })
      .sort(function (a, b) { return (b.data + b.id).localeCompare(a.data + a.id); });
    var body = '<p class="muted mt0" style="margin-top:-6px">Estoque atual: <b>' + num(p.estoque) + " un</b></p>";
    if (!movs.length) {
      body += emptyBox("↕", "Sem movimentações registradas.", "");
    } else {
      body += '<div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th class="num">Qtd</th><th>Motivo</th></tr></thead><tbody>';
      movs.forEach(function (m) {
        var t = m.tipo === "entrada" ? "<span class='tag-in'>Entrada</span>" : m.tipo === "saida" ? "<span class='tag-out'>Saída</span>" : "<span class='muted'>Ajuste</span>";
        var sign = m.tipo === "entrada" ? "+" : m.tipo === "saida" ? "−" : "=";
        body += "<tr><td class='nowrap'>" + dateBR(m.data) + "</td><td>" + t + "</td><td class='num'>" + sign + num(m.qtd) + "</td><td>" + esc(m.motivo || "—") + "</td></tr>";
      });
      body += "</tbody></table></div>";
    }
    body += '<div class="modal-foot"><button class="btn btn-primary" data-close>Fechar</button></div>';
    openModal("Movimentações — " + p.nome, body);
  }

  function abrirMovRapida(preId) {
    if (!DB.produtos.length) { toast("Cadastre um produto primeiro.", "err"); return; }
    var opts = DB.produtos.map(function (p) {
      return '<option value="' + p.id + '"' + (preId === p.id ? " selected" : "") + ">" + esc(p.nome) + " (" + num(p.estoque) + " un)</option>";
    }).join("");
    var body = '' +
      '<form id="formMov">' +
        '<div class="field"><span>Produto</span><select class="select" name="produtoId" required>' + opts + "</select></div>" +
        '<div class="field"><span>Tipo de movimentação</span>' +
          '<div class="chips" data-chips="tipo">' +
            '<button type="button" class="chip is-on" data-val="entrada">➕ Entrada</button>' +
            '<button type="button" class="chip" data-val="saida">➖ Saída</button>' +
            '<button type="button" class="chip" data-val="ajuste">✎ Ajuste</button>' +
          "</div><input type='hidden' name='tipo' value='entrada'></div>" +
        '<div class="field-row">' +
          '<div class="field"><span>Quantidade</span><input class="input" name="qtd" inputmode="numeric" required placeholder="0"></div>' +
          '<div class="field"><span>Data</span><input class="input" type="date" name="data" value="' + todayISO() + '"></div>' +
        "</div>" +
        '<div class="field"><span>Motivo <span class="hint">(opcional)</span></span><input class="input" name="motivo" placeholder="Ex.: compra do fornecedor, perda, contagem…"></div>' +
        '<p class="muted" style="font-size:12.5px;margin-top:-4px">Ajuste define o estoque para o número informado.</p>' +
        '<div class="modal-foot"><button type="button" class="btn btn-outline" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Registrar</button></div>' +
      "</form>";
    openModal("Entrada / Saída de estoque", body, function (b) {
      wireChips(b);
      b.querySelector("#formMov").addEventListener("submit", function (e) {
        e.preventDefault();
        var f = new FormData(e.target);
        var qtd = Math.round(toNumber(f.get("qtd")));
        if (qtd < 0) return;
        moverEstoque(f.get("produtoId"), f.get("tipo"), qtd, f.get("motivo"), f.get("data"));
        save(); closeModal(); render();
        toast("Movimentação registrada.", "ok");
      });
    });
  }

  /* ================================================================== *
   *  VIEW: VENDAS
   * ================================================================== */
  var vendasMes = currentMonth();

  function viewVendas() {
    var html = pageHead("Vendas", "Registre as vendas — o estoque baixa automaticamente.",
      '<button class="btn btn-primary" data-action="nova-venda">+ Registrar venda</button>');

    html += '<div class="toolbar"><input class="input" type="month" id="vMes" value="' + vendasMes + '" style="max-width:190px"></div>';

    var lista = DB.lancamentos.filter(function (l) { return l.tipo === "receita" && l.produtoId && monthKey(l.data) === vendasMes; })
      .sort(function (a, b) { return (b.data + b.id).localeCompare(a.data + a.id); });

    var totQtd = lista.reduce(function (s, l) { return s + Number(l.qtd || 0); }, 0);
    var totVal = lista.reduce(function (s, l) { return s + Number(l.valor || 0); }, 0);
    var totLucro = lista.reduce(function (s, l) { return s + (Number(l.valor || 0) - Number(l.custo || 0)); }, 0);

    html += '<div class="kpi-grid">';
    html += kpi("Vendas no mês", num(lista.length), num(totQtd) + " peça(s)");
    html += kpi("Faturamento", money(totVal), "");
    html += kpi("Lucro (margem)", money(totLucro), "venda − custo", totLucro >= 0 ? "pos" : "neg");
    html += "</div>";

    html += '<div class="card"><div class="card-body flush">';
    if (!lista.length) {
      html += emptyBox("🛍️", "Nenhuma venda em " + monthLabel(vendasMes) + ".", 'Clique em "+ Registrar venda".');
    } else {
      html += '<div class="table-wrap"><table><thead><tr><th>Data</th><th>Produto</th><th class="num">Qtd</th><th class="num">Total</th><th class="num">Lucro</th><th>Pgto</th><th></th></tr></thead><tbody>';
      lista.forEach(function (l) {
        var p = produtoById(l.produtoId);
        var lucro = Number(l.valor || 0) - Number(l.custo || 0);
        html += "<tr><td class='nowrap'>" + dateBR(l.data) + "</td>" +
          "<td><div class='cell-name'>" + esc(p ? p.nome : l.descricao || "(removido)") + "</div>" + (l.descricao && p ? "<div class='cell-sub'>" + esc(l.descricao) + "</div>" : "") + "</td>" +
          "<td class='num'>" + num(l.qtd) + "</td>" +
          "<td class='num'>" + money(l.valor) + "</td>" +
          "<td class='num'>" + money(lucro) + "</td>" +
          "<td><span class='badge badge-muted'>" + esc(l.pagamento || "—") + "</span></td>" +
          "<td><div class='row-actions'><button class='icon-btn danger' data-delvenda='" + l.id + "' title='Estornar'>🗑</button></div></td></tr>";
      });
      html += "</tbody></table></div>";
    }
    html += "</div></div>";
    return html;
  }

  function abrirFormVenda() {
    if (!DB.produtos.length) { toast("Cadastre um produto primeiro.", "err"); return; }
    var opts = '<option value="">Selecione…</option>' + DB.produtos.map(function (p) {
      return '<option value="' + p.id + '" data-preco="' + p.preco + '" data-custo="' + p.custo + '" data-estoque="' + p.estoque + '">' +
        esc(p.nome) + " — " + money(p.preco) + " (" + num(p.estoque) + " un)</option>";
    }).join("");
    var pag = DB.pagamentos.map(function (x) { return "<option>" + esc(x) + "</option>"; }).join("");
    var body = '' +
      '<form id="formVenda">' +
        '<div class="field"><span>Produto *</span><select class="select" name="produtoId" id="vProd" required>' + opts + "</select><p class='muted' id='vEstoqueInfo' style='font-size:12.5px;margin:6px 0 0'></p></div>" +
        '<div class="field-row">' +
          '<div class="field"><span>Quantidade *</span><input class="input" name="qtd" id="vQtd" inputmode="numeric" value="1" required></div>' +
          '<div class="field"><span>Preço unitário (R$)</span><input class="input" name="precoUnit" id="vPreco" inputmode="decimal" placeholder="0,00"></div>' +
        "</div>" +
        '<div class="field-row">' +
          '<div class="field"><span>Forma de pagamento</span><select class="select" name="pagamento">' + pag + "</select></div>" +
          '<div class="field"><span>Data</span><input class="input" type="date" name="data" value="' + todayISO() + '"></div>' +
        "</div>" +
        '<div class="field"><span>Observação <span class="hint">(opcional)</span></span><input class="input" name="obs" placeholder="Ex.: cliente Maria, tamanho M"></div>' +
        '<div class="card" style="box-shadow:none;margin:0 0 6px"><div class="card-body" style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center">' +
          '<span class="muted">Total da venda</span><b id="vTotal" style="font-size:20px;color:var(--plum-900)">R$ 0,00</b></div></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-outline" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Registrar venda</button></div>' +
      "</form>";
    openModal("Registrar venda", body, function (b) {
      var prod = b.querySelector("#vProd"), qtd = b.querySelector("#vQtd"), preco = b.querySelector("#vPreco");
      var total = b.querySelector("#vTotal"), info = b.querySelector("#vEstoqueInfo");
      function recalc() {
        var opt = prod.options[prod.selectedIndex];
        var estoque = opt ? Number(opt.getAttribute("data-estoque")) : 0;
        var q = Math.round(toNumber(qtd.value));
        var pu = toNumber(preco.value);
        total.textContent = money(pu * q);
        if (prod.value) {
          info.innerHTML = "Em estoque: <b>" + num(estoque) + " un</b>" + (q > estoque ? " · <span style='color:var(--red)'>quantidade acima do estoque!</span>" : "");
        } else info.textContent = "";
      }
      prod.addEventListener("change", function () {
        var opt = prod.options[prod.selectedIndex];
        if (opt && opt.value) preco.value = opt.getAttribute("data-preco");
        recalc();
      });
      qtd.addEventListener("input", recalc);
      preco.addEventListener("input", recalc);
      b.querySelector("#formVenda").addEventListener("submit", function (e) {
        e.preventDefault();
        var f = new FormData(e.target);
        var p = produtoById(f.get("produtoId"));
        if (!p) return;
        var q = Math.round(toNumber(f.get("qtd")));
        if (q <= 0) { toast("Informe a quantidade.", "err"); return; }
        var pu = toNumber(f.get("precoUnit"));
        var data = f.get("data") || todayISO();
        // baixa estoque
        moverEstoque(p.id, "saida", q, "Venda", data);
        // lançamento financeiro
        DB.lancamentos.unshift({
          id: uid(), data: data, tipo: "receita", categoria: "Venda",
          descricao: (f.get("obs") || "").trim(), valor: pu * q, custo: Number(p.custo || 0) * q,
          produtoId: p.id, qtd: q, pagamento: f.get("pagamento") || "",
        });
        save(); closeModal(); render();
        toast("Venda registrada! Estoque atualizado.", "ok");
      });
    });
  }

  function estornarVenda(id) {
    var idx = DB.lancamentos.findIndex(function (l) { return l.id === id; });
    if (idx < 0) return;
    var l = DB.lancamentos[idx];
    if (l.produtoId && l.qtd) moverEstoque(l.produtoId, "entrada", l.qtd, "Estorno de venda", todayISO());
    DB.lancamentos.splice(idx, 1);
    save(); render();
    toast("Venda estornada. Estoque devolvido.", "ok");
  }

  /* ================================================================== *
   *  VIEW: FINANCEIRO
   * ================================================================== */
  var finMes = currentMonth();

  function viewFinanceiro() {
    var html = pageHead("Financeiro", "Controle de entradas e saídas de dinheiro.",
      '<button class="btn btn-outline" data-action="nova-receita">+ Receita</button>' +
      '<button class="btn btn-primary" data-action="nova-despesa">+ Despesa</button>');

    html += '<div class="toolbar"><input class="input" type="month" id="finMesInput" value="' + finMes + '" style="max-width:190px"></div>';

    var doMes = filtroMes(DB.lancamentos, finMes).sort(function (a, b) { return (b.data + b.id).localeCompare(a.data + a.id); });
    var rec = somaReceita(doMes), desp = somaDespesa(doMes);

    html += '<div class="kpi-grid">';
    html += kpi("Entradas (receitas)", money(rec), "", "pos");
    html += kpi("Saídas (despesas)", money(desp), "", "neg");
    html += kpi("Resultado do mês", money(rec - desp), "entradas − saídas", rec - desp >= 0 ? "pos" : "neg");
    html += kpi("Saldo em caixa", money(saldoCaixa()), "acumulado", saldoCaixa() >= 0 ? "" : "neg");
    html += "</div>";

    html += '<div class="card"><div class="card-head"><h3>Lançamentos de ' + monthLabel(finMes) + "</h3></div><div class='card-body flush'>";
    if (!doMes.length) {
      html += emptyBox("💰", "Nenhum lançamento neste mês.", "Registre receitas e despesas nos botões acima.");
    } else {
      html += '<div class="table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="num">Valor</th><th></th></tr></thead><tbody>';
      doMes.forEach(function (l) {
        var isRec = l.tipo === "receita";
        var val = (isRec ? "+ " : "− ") + money(l.valor).replace("R$", "R$");
        html += "<tr><td class='nowrap'>" + dateBR(l.data) + "</td>" +
          "<td><div class='cell-name'>" + esc(l.descricao || (isRec ? "Receita" : "Despesa")) + "</div>" +
          (l.produtoId ? "<div class='cell-sub'>venda de produto</div>" : "") + "</td>" +
          "<td><span class='badge " + (isRec ? "badge-green" : "badge-red") + "'>" + esc(l.categoria || "—") + "</span></td>" +
          "<td class='num " + (isRec ? "" : "") + "' style='color:" + (isRec ? "var(--green)" : "var(--red)") + ";font-weight:700'>" + val + "</td>" +
          "<td><div class='row-actions'>" +
          (l.produtoId ? "" : "<button class='icon-btn danger' data-dellanc='" + l.id + "' title='Excluir'>🗑</button>") +
          "</div></td></tr>";
      });
      html += "</tbody></table></div>";
    }
    html += "</div></div>";
    return html;
  }

  function abrirFormLancamento(tipo) {
    var isRec = tipo === "receita";
    var cats = (isRec ? ["Venda avulsa", "Serviço", "Outra entrada"] : DB.categoriasDespesa).map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("");
    var pag = DB.pagamentos.map(function (x) { return "<option>" + esc(x) + "</option>"; }).join("");
    var body = '' +
      '<form id="formLanc">' +
        '<div class="field"><span>Descrição *</span><input class="input" name="descricao" required placeholder="' + (isRec ? "Ex.: venda balcão, sinal de encomenda" : "Ex.: aluguel de julho, sacolas") + '"></div>' +
        '<div class="field-row">' +
          '<div class="field"><span>Valor (R$) *</span><input class="input" name="valor" inputmode="decimal" required placeholder="0,00"></div>' +
          '<div class="field"><span>Data</span><input class="input" type="date" name="data" value="' + todayISO() + '"></div>' +
        "</div>" +
        '<div class="field-row">' +
          '<div class="field"><span>Categoria</span><select class="select" name="categoria">' + cats + "</select></div>" +
          '<div class="field"><span>Pagamento</span><select class="select" name="pagamento">' + pag + "</select></div>" +
        "</div>" +
        '<div class="modal-foot"><button type="button" class="btn btn-outline" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Salvar ' + (isRec ? "receita" : "despesa") + "</button></div>" +
      "</form>";
    openModal(isRec ? "Nova receita" : "Nova despesa", body, function (b) {
      b.querySelector("#formLanc").addEventListener("submit", function (e) {
        e.preventDefault();
        var f = new FormData(e.target);
        var valor = toNumber(f.get("valor"));
        if (valor <= 0) { toast("Informe um valor.", "err"); return; }
        DB.lancamentos.unshift({
          id: uid(), data: f.get("data") || todayISO(), tipo: tipo,
          categoria: f.get("categoria") || "", descricao: (f.get("descricao") || "").trim(),
          valor: valor, custo: 0, produtoId: null, qtd: 0, pagamento: f.get("pagamento") || "",
        });
        save(); closeModal(); render();
        toast((isRec ? "Receita" : "Despesa") + " registrada.", "ok");
      });
    });
  }

  /* ================================================================== *
   *  VIEW: RELATÓRIOS
   * ================================================================== */
  var relMes = currentMonth();

  function viewRelatorios() {
    var html = pageHead("Relatórios", "Resumo do desempenho por período.");
    html += '<div class="toolbar"><input class="input" type="month" id="relMesInput" value="' + relMes + '" style="max-width:190px">' +
      '<button class="btn btn-outline" data-action="imprimir">Imprimir / PDF</button></div>';

    var doMes = filtroMes(DB.lancamentos, relMes);
    var fat = somaReceita(doMes), cmv = somaCMV(doMes), desp = somaDespesa(doMes);
    var lucroBruto = fat - cmv, lucroLiq = lucroBruto - desp;
    var margem = fat > 0 ? Math.round(lucroLiq / fat * 100) : 0;

    html += '<div class="kpi-grid">';
    html += kpi("Faturamento", money(fat), "");
    html += kpi("Custo dos produtos", money(cmv), "CMV vendido", "neg");
    html += kpi("Lucro bruto", money(lucroBruto), "faturam. − CMV", lucroBruto >= 0 ? "pos" : "neg");
    html += kpi("Lucro líquido", money(lucroLiq), "margem " + margem + "%", lucroLiq >= 0 ? "pos" : "neg");
    html += "</div>";

    html += '<div class="two-col">';

    // Despesas por categoria
    var porCat = {};
    doMes.filter(function (l) { return l.tipo === "despesa"; }).forEach(function (l) {
      porCat[l.categoria || "Outros"] = (porCat[l.categoria || "Outros"] || 0) + Number(l.valor || 0);
    });
    var cats = Object.keys(porCat).map(function (k) { return { nome: k, val: porCat[k] }; }).sort(function (a, b) { return b.val - a.val; });
    var maxCat = cats.reduce(function (m, c) { return Math.max(m, c.val); }, 0) || 1;

    html += '<div class="card"><div class="card-head"><h3>Despesas por categoria</h3></div><div class="card-body">';
    if (cats.length) {
      html += '<div class="bar-list">';
      cats.forEach(function (c) {
        html += '<div class="bar-row"><div class="name">' + esc(c.nome) + '</div><div class="bar-track"><div class="bar-fill" style="width:' + Math.max(6, c.val / maxCat * 100) + '%;background:var(--red)"></div></div><div class="val">' + money(c.val) + "</div></div>";
      });
      html += "</div>";
    } else html += emptyBox("🧾", "Sem despesas no período.", "");
    html += "</div></div>";

    // Produtos mais lucrativos
    var vend = doMes.filter(function (l) { return l.tipo === "receita" && l.produtoId; });
    var pl = {};
    vend.forEach(function (l) {
      if (!pl[l.produtoId]) pl[l.produtoId] = { qtd: 0, lucro: 0 };
      pl[l.produtoId].qtd += Number(l.qtd || 0);
      pl[l.produtoId].lucro += Number(l.valor || 0) - Number(l.custo || 0);
    });
    var lucroList = Object.keys(pl).map(function (id) {
      var p = produtoById(id);
      return { nome: p ? p.nome : "(removido)", qtd: pl[id].qtd, lucro: pl[id].lucro };
    }).sort(function (a, b) { return b.lucro - a.lucro; }).slice(0, 6);
    var maxL = lucroList.reduce(function (m, x) { return Math.max(m, x.lucro); }, 0) || 1;

    html += '<div class="card"><div class="card-head"><h3>Produtos mais lucrativos</h3></div><div class="card-body">';
    if (lucroList.length) {
      html += '<div class="bar-list">';
      lucroList.forEach(function (x) {
        html += '<div class="bar-row"><div class="name" title="' + esc(x.nome) + '">' + esc(x.nome) + '</div><div class="bar-track"><div class="bar-fill" style="width:' + Math.max(6, x.lucro / maxL * 100) + '%"></div></div><div class="val">' + money(x.lucro) + "</div></div>";
      });
      html += "</div>";
    } else html += emptyBox("📈", "Sem vendas no período.", "");
    html += "</div></div>";

    html += "</div>"; // two-col

    // Resumo do caixa geral
    html += '<div class="card"><div class="card-head"><h3>Posição geral</h3></div><div class="card-body">' +
      '<div class="kpi-grid" style="margin:0">' +
      kpi("Saldo em caixa (total)", money(saldoCaixa()), "todas as entradas − saídas", saldoCaixa() >= 0 ? "pos" : "neg") +
      kpi("Valor em estoque (custo)", money(valorEstoqueCusto()), "") +
      kpi("Potencial de venda", money(valorEstoqueVenda()), "estoque a preço de venda") +
      "</div></div></div>";

    return html;
  }

  /* ================================================================== *
   *  VIEW: BACKUP
   * ================================================================== */
  function viewBackup() {
    var html = pageHead("Backup e dados", "Seus dados ficam só neste navegador. Faça backup com frequência.");

    html += '<div class="alert alert-amber"><span>💡</span><div>Os dados são salvos apenas <b>neste dispositivo/navegador</b>. Se limpar o histórico do navegador ou trocar de aparelho, você precisa importar um backup. Exporte um arquivo regularmente.</div></div>';

    html += '<div class="card"><div class="card-head"><h3>Exportar</h3></div><div class="card-body">' +
      '<p class="muted mt0" style="margin-top:0">Baixe um arquivo <b>.json</b> com todos os produtos, vendas, despesas e movimentações.</p>' +
      '<button class="btn btn-primary" data-action="exportar">⬇ Baixar backup</button></div></div>';

    html += '<div class="card"><div class="card-head"><h3>Importar</h3></div><div class="card-body">' +
      '<p class="muted mt0" style="margin-top:0">Selecione um arquivo de backup. <b>Isso substitui todos os dados atuais.</b></p>' +
      '<input type="file" id="fileImport" accept="application/json,.json" class="input" style="max-width:340px"></div></div>';

    var counts = "Produtos: <b>" + num(DB.produtos.length) + "</b> · Lançamentos: <b>" + num(DB.lancamentos.length) +
      "</b> · Movimentações: <b>" + num(DB.movimentacoes.length) + "</b>";
    html += '<div class="card"><div class="card-head"><h3>Zona de risco</h3></div><div class="card-body">' +
      '<p class="muted mt0" style="margin-top:0">' + counts + "</p>" +
      '<button class="btn btn-danger" data-action="zerar">Apagar todos os dados</button>' +
      '<button class="btn btn-outline" data-action="trocar-senha" style="margin-left:8px">Trocar senha</button></div></div>';
    return html;
  }

  function exportarBackup() {
    var data = JSON.stringify(DB, null, 2);
    var blob = new Blob([data], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mova-gestao-backup-" + todayISO() + ".json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("Backup baixado.", "ok");
  }

  function importarBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data.produtos || !data.lancamentos) throw new Error("formato");
        if (!confirm("Isso vai SUBSTITUIR todos os dados atuais pelos do arquivo. Continuar?")) return;
        Object.keys(DEFAULT_DB).forEach(function (k) { if (data[k] == null) data[k] = clone(DEFAULT_DB[k]); });
        DB = data;
        save(); render();
        toast("Backup importado com sucesso.", "ok");
      } catch (e) {
        toast("Arquivo inválido. Verifique se é um backup do sistema.", "err");
      }
    };
    reader.readAsText(file);
  }

  function trocarSenha() {
    var body = '<form id="formSenha">' +
      '<div class="field"><span>Nova senha</span><input class="input" type="password" name="s1" required placeholder="Mínimo 4 caracteres"></div>' +
      '<div class="field"><span>Confirme a senha</span><input class="input" type="password" name="s2" required></div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-outline" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Salvar senha</button></div></form>';
    openModal("Trocar senha", body, function (b) {
      b.querySelector("#formSenha").addEventListener("submit", function (e) {
        e.preventDefault();
        var f = new FormData(e.target);
        var s1 = (f.get("s1") || "").trim(), s2 = (f.get("s2") || "").trim();
        if (s1.length < 4) { toast("Use pelo menos 4 caracteres.", "err"); return; }
        if (s1 !== s2) { toast("As senhas não conferem.", "err"); return; }
        storeSet(AUTH_KEY, hash(s1));
        closeModal();
        toast("Senha atualizada.", "ok");
      });
    });
  }

  /* ------------------------------------------------------------------ *
   *  COMPONENTES HTML
   * ------------------------------------------------------------------ */
  function pageHead(title, sub, actions) {
    return '<div class="page-head"><div><h1>' + esc(title) + "</h1>" + (sub ? "<p>" + sub + "</p>" : "") +
      "</div>" + (actions ? '<div class="page-actions">' + actions + "</div>" : "") + "</div>";
  }
  function kpi(label, value, sub, cls) {
    return '<div class="kpi"><div class="kpi-label">' + esc(label) + '</div><div class="kpi-value ' + (cls || "") + '">' +
      value + "</div>" + (sub ? '<div class="kpi-sub">' + sub + "</div>" : "") + "</div>";
  }
  function emptyBox(emoji, title, sub) {
    return '<div class="empty"><span class="emoji">' + emoji + "</span><p>" + esc(title) + "</p>" + (sub ? '<p class="muted">' + esc(sub) + "</p>" : "") + "</div>";
  }
  function wireChips(scope) {
    scope.querySelectorAll("[data-chips]").forEach(function (group) {
      var input = group.parentElement.querySelector("input[type=hidden]");
      group.querySelectorAll(".chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
          group.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("is-on"); });
          chip.classList.add("is-on");
          if (input) input.value = chip.getAttribute("data-val");
        });
      });
    });
  }

  /* ------------------------------------------------------------------ *
   *  RENDER PRINCIPAL
   * ------------------------------------------------------------------ */
  var VIEWS = {
    dashboard: viewDashboard,
    estoque: viewEstoque,
    vendas: viewVendas,
    financeiro: viewFinanceiro,
    relatorios: viewRelatorios,
    backup: viewBackup,
  };

  function bannerSemSalvar() {
    if (canPersist) return "";
    return '<div class="alert alert-amber" style="border-color:#e7b84d">' +
      '<span>⚠️</span><div><b>Modo sem salvar.</b> Este navegador bloqueou o armazenamento, então tudo que você registrar aqui <b>some quando fechar a aba</b>. ' +
      'Isso costuma acontecer no <b>Safari abrindo um arquivo baixado</b>. Para os dados ficarem salvos de verdade, o ideal é acessar o painel por um <b>link (site publicado)</b> em vez de um arquivo — fale com quem montou o sistema. ' +
      'Enquanto isso, use a aba <b>Backup</b> para exportar antes de fechar.</div></div>';
  }

  function render() {
    document.getElementById("content").innerHTML = bannerSemSalvar() + (VIEWS[currentView] || viewDashboard)();
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-view") === currentView);
    });
    wirePage();
  }

  function goto(view) {
    currentView = view;
    document.getElementById("app").classList.remove("menu-open");
    render();
  }

  /* ------------------------------------------------------------------ *
   *  LIGAÇÃO DE EVENTOS DA PÁGINA ATUAL
   * ------------------------------------------------------------------ */
  function wirePage() {
    var content = document.getElementById("content");

    // filtros de estoque
    var fBusca = content.querySelector("#fBusca");
    if (fBusca) {
      fBusca.addEventListener("input", function () { estoqueFiltro.busca = fBusca.value; rerenderEstoque(); });
      content.querySelector("#fCat").addEventListener("change", function (e) { estoqueFiltro.categoria = e.target.value; render(); });
      content.querySelector("#fStatus").addEventListener("change", function (e) { estoqueFiltro.status = e.target.value; render(); });
    }
    // seletor de mês (vendas/financeiro/relatórios)
    var vMes = content.querySelector("#vMes");
    if (vMes) vMes.addEventListener("change", function () { vendasMes = vMes.value; render(); });
    var fMes = content.querySelector("#finMesInput");
    if (fMes) fMes.addEventListener("change", function () { finMes = fMes.value; render(); });
    var rMes = content.querySelector("#relMesInput");
    if (rMes) rMes.addEventListener("change", function () { relMes = rMes.value; render(); });
    // import de arquivo
    var file = content.querySelector("#fileImport");
    if (file) file.addEventListener("change", function () { if (file.files[0]) importarBackup(file.files[0]); });

    // ações por data-action
    content.querySelectorAll("[data-action]").forEach(function (b) {
      b.addEventListener("click", function () { handleAction(b.getAttribute("data-action")); });
    });
    // linhas de estoque
    content.querySelectorAll("[data-edit]").forEach(function (b) { b.addEventListener("click", function () { abrirFormProduto(produtoById(b.getAttribute("data-edit"))); }); });
    content.querySelectorAll("[data-hist]").forEach(function (b) { b.addEventListener("click", function () { abrirHistorico(b.getAttribute("data-hist")); }); });
    content.querySelectorAll("[data-del]").forEach(function (b) { b.addEventListener("click", function () { excluirProduto(b.getAttribute("data-del")); }); });
    content.querySelectorAll("[data-delvenda]").forEach(function (b) { b.addEventListener("click", function () { if (confirm("Estornar esta venda? O estoque será devolvido.")) estornarVenda(b.getAttribute("data-delvenda")); }); });
    content.querySelectorAll("[data-dellanc]").forEach(function (b) { b.addEventListener("click", function () { excluirLancamento(b.getAttribute("data-dellanc")); }); });
    // atalhos internos
    content.querySelectorAll("[data-goto]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); goto(a.getAttribute("data-goto")); }); });
  }

  function rerenderEstoque() {
    // re-renderiza só mantendo o foco no campo de busca
    var val = estoqueFiltro.busca;
    render();
    var f = document.getElementById("fBusca");
    if (f) { f.focus(); f.value = val; f.setSelectionRange(val.length, val.length); }
  }

  function handleAction(action) {
    switch (action) {
      case "novo-produto": abrirFormProduto(null); break;
      case "mov-rapida": abrirMovRapida(); break;
      case "nova-venda": abrirFormVenda(); break;
      case "nova-receita": abrirFormLancamento("receita"); break;
      case "nova-despesa": abrirFormLancamento("despesa"); break;
      case "exportar": exportarBackup(); break;
      case "trocar-senha": trocarSenha(); break;
      case "imprimir": window.print(); break;
      case "zerar":
        if (confirm("APAGAR todos os dados (produtos, vendas, despesas)? Isso não pode ser desfeito. Faça um backup antes!")) {
          DB = clone(DEFAULT_DB); save(); render(); toast("Todos os dados foram apagados.", "ok");
        }
        break;
    }
  }

  function excluirProduto(id) {
    var p = produtoById(id);
    if (!p) return;
    if (!confirm('Excluir o produto "' + p.nome + '"? As vendas já registradas serão mantidas no histórico.')) return;
    DB.produtos = DB.produtos.filter(function (x) { return x.id !== id; });
    save(); render(); toast("Produto excluído.", "ok");
  }
  function excluirLancamento(id) {
    if (!confirm("Excluir este lançamento?")) return;
    DB.lancamentos = DB.lancamentos.filter(function (l) { return l.id !== id; });
    save(); render(); toast("Lançamento excluído.", "ok");
  }

  /* ------------------------------------------------------------------ *
   *  EVENTOS GLOBAIS (uma vez)
   * ------------------------------------------------------------------ */
  function setupGlobal() {
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.addEventListener("click", function () { goto(b.getAttribute("data-view")); });
    });
    document.getElementById("btnMenu").addEventListener("click", function () {
      document.getElementById("app").classList.toggle("menu-open");
    });
    // modal
    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("modalBackdrop").addEventListener("click", function (e) {
      if (e.target.id === "modalBackdrop") closeModal();
    });
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
  }

  /* ------------------------------------------------------------------ *
   *  INÍCIO
   * ------------------------------------------------------------------ */
  setupLock();
  setupGlobal();
  // se já não houver app escondido... (fluxo controlado pela tela de bloqueio)
})();
