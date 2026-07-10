/* =====================================================================
   CARRINHO DE COMPRAS
   ---------------------------------------------------------------------
   Estado persistido em localStorage. Expõe window.Cart com métodos
   usados pela interface (main.js).
   ===================================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "loja-roberta-carrinho";

  // ---- Formatação de preço ----
  function formatarPreco(valor) {
    var moeda = (window.CONFIG && window.CONFIG.currency) || "R$";
    return moeda + " " + valor.toFixed(2).replace(".", ",");
  }

  // ---- Carregar / salvar estado ----
  function carregar() {
    try {
      var dados = localStorage.getItem(STORAGE_KEY);
      return dados ? JSON.parse(dados) : [];
    } catch (e) {
      return [];
    }
  }

  function salvar(itens) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
    } catch (e) {
      /* localStorage indisponível — segue apenas em memória */
    }
  }

  var itens = carregar(); // [{ id, tamanho, qtd }]

  // ---- Buscar produto no catálogo ----
  function acharProduto(id) {
    return (window.PRODUTOS || []).filter(function (p) {
      return p.id === id;
    })[0];
  }

  // ---- API pública ----
  var Cart = {
    onChange: null, // callback definido em main.js

    itens: function () {
      return itens;
    },

    /* Adiciona um produto (id + tamanho). Se já existir a mesma combinação,
       apenas incrementa a quantidade. */
    addItem: function (id, tamanho) {
      var existente = itens.filter(function (i) {
        return i.id === id && i.tamanho === tamanho;
      })[0];
      if (existente) {
        existente.qtd += 1;
      } else {
        itens.push({ id: id, tamanho: tamanho, qtd: 1 });
      }
      this._commit();
    },

    removeItem: function (id, tamanho) {
      itens = itens.filter(function (i) {
        return !(i.id === id && i.tamanho === tamanho);
      });
      this._commit();
    },

    updateQty: function (id, tamanho, delta) {
      var item = itens.filter(function (i) {
        return i.id === id && i.tamanho === tamanho;
      })[0];
      if (!item) return;
      item.qtd += delta;
      if (item.qtd <= 0) {
        this.removeItem(id, tamanho);
        return;
      }
      this._commit();
    },

    /* Total de peças (para o contador do header). */
    totalItens: function () {
      return itens.reduce(function (s, i) {
        return s + i.qtd;
      }, 0);
    },

    /* Valor total em dinheiro. */
    getTotal: function () {
      return itens.reduce(function (soma, i) {
        var p = acharProduto(i.id);
        return soma + (p ? p.preco * i.qtd : 0);
      }, 0);
    },

    /* Monta a mensagem do pedido e abre o WhatsApp. */
    checkout: function () {
      if (itens.length === 0) return false;

      var cfg = window.CONFIG || {};
      var linhas = [];
      linhas.push("Olá! Gostaria de fazer um pedido na " + (cfg.storeName || "loja") + ":");
      linhas.push("");

      itens.forEach(function (i) {
        var p = acharProduto(i.id);
        if (!p) return;
        linhas.push(
          "• " + p.nome +
          " | Tam: " + i.tamanho +
          " | Qtd: " + i.qtd +
          " | " + formatarPreco(p.preco * i.qtd)
        );
      });

      linhas.push("");
      linhas.push("Total: " + formatarPreco(this.getTotal()));

      var texto = encodeURIComponent(linhas.join("\n"));
      var numero = (cfg.whatsappNumber || "").replace(/\D/g, "");
      var url = "https://wa.me/" + numero + "?text=" + texto;
      window.open(url, "_blank");
      return true;
    },

    /* Detalhes prontos para renderização (usado por main.js). */
    detalhado: function () {
      return itens
        .map(function (i) {
          var p = acharProduto(i.id);
          if (!p) return null;
          return {
            id: i.id,
            tamanho: i.tamanho,
            qtd: i.qtd,
            nome: p.nome,
            preco: p.preco,
            cor: p.cor,
            imagem: p.imagem,
            subtotal: p.preco * i.qtd,
          };
        })
        .filter(Boolean);
    },

    _commit: function () {
      salvar(itens);
      if (typeof this.onChange === "function") this.onChange();
    },
  };

  window.Cart = Cart;
  window.formatarPreco = formatarPreco;
})();
