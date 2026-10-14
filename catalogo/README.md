# Catálogo mova. action

Catálogo em PDF no formato **tela de celular (1080 × 1920)**, com o layout do catálogo 2026
anterior e as cores da marca mova. (malva `#8b687e`, ameixa `#2b2026`, rosa-malva `#f3e9ef`).
Fontes: **Jost** (textos e nomes) e **Ms Madi** (frases cursivas).

## Arquivos prontos

| Arquivo | Para quê |
| --- | --- |
| `saida/Catalogo-mova-action-WhatsApp.pdf` | Versão leve para mandar no WhatsApp/Instagram |
| `saida/Catalogo-mova-action.pdf` | Alta definição (fotos ampliadas, arquivo grande) |

## Como o catálogo está organizado

1. **Capa** — foto Rose (087) em página inteira com a logo.
2. **Boas-vindas e "Nesta edição"** — índice com as seções e as páginas.
3. **Como comprar** — passo a passo, legenda das bolinhas e contatos.
4. **Sete seções**, cada uma com página de abertura (título, frase cursiva e lista das peças
   com o número da página): Macacões · Macaquinhos · Conjuntos com Legging ·
   Conjuntos com Short · Looks para Combinar · Camisetas · Editorial.
5. **Contracapa** — "Peça pelo WhatsApp".

Cada foto ocupa uma página inteira, com uma faixa escura embaixo trazendo **tipo · cor,
nome, preço e tamanhos** (bolinhas P · M · G: preenchida = disponível). Nos looks de peças
vendidas separadamente aparecem as duas peças com seus preços e o **look completo**.
As fotos que já vieram com nome e preço escritos e as aberturas de cartela do Editorial
(ROSE, DUAL, PETROL, MOCHA) aparecem como estão, sem a faixa.

No canto de cima de cada página: seção · número da página e a **Ref.** da peça.

## Como editar nomes, preços e tamanhos

Tudo fica em **`dados.json`**, dentro de `secoes` → `produtos`. Cada produto tem:

- `tipo` e `nome` (ex.: `"Macacão"` + `"Amélia"`), `cor` e `preco` (ex.: `"238,00"`).
- `tamanhos`: lista dos disponíveis, ex.: `["P", "M"]`. Sem a lista, aparece "Consulte".
- `pecas`: para looks vendidos por peça, ex.:
  `[{ "tipo": "Top", "nome": "Luanda", "preco": "140,00" }, { "tipo": "Legging", ... }]`.
  O look completo é a soma das peças (ou o valor em `"look"`).
- `fotos`: uma entrada por foto (uma página cada), com:
  - `id`: número da foto (ex.: `"007"`);
  - `x`: enquadramento horizontal em % (0 = esquerda, 50 = centro, 100 = direita);
  - `script`: frase cursiva opcional (ex.: `"costas vazadas"`);
  - `cor` e `tamanhos`: quando mudam de uma foto para outra (ex.: Conjunto Maria);
  - `impresso: true`: a foto já tem nome e preço escritos e fica sem a faixa.
- `{ "poster": "028", "grupo": "Rose" }`: abertura de cartela no Editorial.

As **referências (Ref.)** são numeradas sozinhas, na ordem do catálogo.

Depois de editar, gere o PDF de novo:

```bash
cd catalogo
npm install playwright && npx playwright install chromium   # só na primeira vez
node build.cjs --whatsapp            # PDF leve (WhatsApp)
node build.cjs                       # PDF em alta definição
node build.cjs --png                 # também salva prévias em saida/previa/
python3 ferramentas/gerar_web.py     # só se as fotos mudaram (refaz fotos-web/)
```

## Fotos

- `fotos-originais/` guarda as 101 fotos recebidas, numeradas na ordem de envio (001 a 101).
  Duas vieram repetidas e entram uma vez só: **032 = 031** e **087 = 028**.
- `fotos-ajustadas/029.jpg` é a selfie 029 endireitada (chegou inclinada 45°).
- `fotos-hd/` tem as fotos ampliadas 2× com IA (Real-ESRGAN, `ferramentas/upscale.py`).
  As que vieram de print de tela tiveram a linha preta lateral removida
  (`ferramentas/aparar_bordas.py`).
- `fotos-hd/040.jpg` teve o preço impresso da Legging Isabela trocado de 250,00 para 210,00
  (`ferramentas/corrigir_preco_040.py`, usando as letras da própria foto).
- `fotos-web/` tem as versões leves usadas no PDF para WhatsApp.

A logo foi vetorizada (`marca/logo-mova.svg`) para ficar nítida em qualquer tamanho.
