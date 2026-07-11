# mova. action 💪

Site da **mova.** — loja feminina de roupas de academia (moda fitness): catálogo de produtos,
carrinho de compras e finalização do pedido pelo **WhatsApp**.

Feito em **HTML, CSS e JavaScript puro** — sem dependências, sem build. É só abrir e usar.

---

## 🚀 Como rodar

**Opção 1 — abrir direto:** dê dois cliques em `index.html`.

**Opção 2 — servidor local (recomendado):**
```bash
python3 -m http.server 8000
```
Depois acesse <http://localhost:8000> no navegador.

## 🌐 Como publicar (grátis)

- **GitHub Pages:** vá em *Settings → Pages* e selecione a branch. O site fica no ar em um endereço `github.io`.
- **Netlify / Vercel:** arraste a pasta ou conecte o repositório. Não precisa configurar build.

---

## ✏️ Como personalizar

Tudo que você normalmente vai querer trocar está em **3 lugares**:

### 1. Dados da loja → `config.js`
Nome da loja, **número do WhatsApp** (que recebe os pedidos), Instagram, moeda e
valor para frete grátis.

```js
window.CONFIG = {
  storeName: "mova.",
  whatsappNumber: "5585999999999", // código do país + DDD + número, só dígitos
  currency: "R$",
  freeShippingFrom: 199.9,
  instagram: "@mova.action",
};
```

> A logo fica em `assets/mova-logo.jpg` (usada no topo e como favicon). Para trocar a
> imagem, substitua esse arquivo. A cor da marca (`#8b687e`) já está aplicada no `:root`
> do `css/styles.css`.
> O número do WhatsApp usa o formato internacional só com dígitos:
> `55` (Brasil) + `85` (DDD) + `99999-9999` → `5585999999999`.

### 2. Cores da marca → `css/styles.css`
No bloco `:root` (logo após as fontes embutidas), troque as variáveis de cor:

```css
:root {
  --mauve:   #8b687e;  /* cor da marca (botões, destaques) */
  --mauve-700: #6e5162;
  --plum-900: #2b2026; /* texto / rodapé */
  --paper:   #faf6f8;  /* fundo off-white */
  /* ... */
}
```
Só mexer aqui já muda a cara do site inteiro. As fontes (Cormorant Garamond, Jost e
Dancing Script) já vêm **embutidas** no próprio `styles.css` — o site não depende de
internet nem do Google Fonts.

### 3. Produtos → `js/products.js`
Edite o array `PRODUTOS`. Cada produto:

```js
{
  id: 1,                       // único, não repita
  nome: "Legging Power",
  categoria: "Leggings",       // uma das CATEGORIAS do arquivo
  preco: 139.9,
  precoDe: 179.9,              // preço "de" (0 = sem desconto)
  tamanhos: ["P", "M", "G", "GG"],
  cor: "#d6336c",             // cor do placeholder da imagem
  descricao: "Texto curto...",
  imagem: "",                 // deixe "" p/ placeholder, ou coloque a URL/caminho da foto real
}
```
Para usar **fotos reais**, coloque o caminho no campo `imagem`
(ex.: `"assets/legging-power.jpg"`). Se ficar vazio, o site gera um placeholder colorido automaticamente.

As **categorias** ficam no array `CATEGORIAS` (mesmo arquivo) — os filtros e a
navegação se atualizam sozinhos.

---

## 📁 Estrutura

```
Loja-Roberta-/
├── index.html        # página do site
├── config.js         # ⚙️ configurações da loja (WhatsApp, nome, etc.)
├── css/styles.css    # 🎨 estilos + paleta de cores (:root)
├── js/
│   ├── products.js   # 🛍️ catálogo de produtos
│   ├── cart.js       # 🛒 lógica do carrinho + checkout WhatsApp
│   └── main.js       # 🖥️ renderização e interação da interface
└── README.md
```

## ✅ Funcionalidades

- Catálogo com **filtro por categoria** e **busca** por nome
- Seleção de **tamanho** por produto
- **Carrinho** lateral com ajuste de quantidade e remoção
- **Persistência**: o carrinho é salvo no navegador (não some ao recarregar)
- Aviso de **frete grátis** a partir de um valor
- **Checkout via WhatsApp**: gera a mensagem do pedido e abre a conversa
- Layout **responsivo** (celular e computador)

---

> Conteúdo (produtos, textos e imagens) é **fictício** — substitua pelos dados reais da loja.
