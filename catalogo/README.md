# Catálogo mova. action

Catálogo em PDF (A4 retrato) gerado a partir das fotos da loja, com a logo e as cores da
marca (malva `#8b687e`, off-white `#faf6f8`, ameixa `#2b2026`) e as fontes do site
(Cormorant Garamond + Jost).

## Arquivos prontos

| Arquivo | Para quê |
| --- | --- |
| `saida/Catalogo-mova-action.pdf` | Alta definição: impressão e tela grande |
| `saida/Catalogo-mova-action-WhatsApp.pdf` | Versão leve para mandar no WhatsApp/Instagram |

## Como o catálogo está organizado

1. Capa (foto 087, "Rose", em estilo revista; troque em `capa` no `dados.json`)
2. Boas-vindas
3. Sumário
4. Sete seções, cada uma com página de abertura:
   **Macacões · Macaquinhos · Conjuntos com Legging · Conjuntos com Short ·
   Shorts-Saia · Camisetas · Editorial** (Rose, Dual, Petrol, Coral, Mocha)
5. Como comprar
6. Contracapa

Cada peça tem uma **referência (Ref. 01 a 51)** para a cliente pedir pelo número.
As fotos que já vieram com nome e preço impressos aparecem inteiras, sem corte.

## Como editar nomes, preços e textos

Tudo fica em **`dados.json`**:

- **Preço:** `"preco": "189,90"` em qualquer peça. Sem preço, a página mostra
  "Consulte valores e tamanhos".
- **Tamanhos:** `"tamanhos": ["P", "M"]` lista os tamanhos disponíveis. No catálogo eles
  aparecem como bolinhas P · M · G: preenchida = disponível, só o contorno = indisponível.
- **Peças vendidas separadamente:** `"pecas": [{ "tipo": "Top", "nome": "Luanda", "preco": "140,00" }, ...]`.
  O "look completo" é a soma das peças (ou o valor em `"look"`).
- **Cor:** `"cor": "Vinho"` aparece ao lado da referência.
- **Referências (Ref.)** são numeradas sozinhas, na ordem das páginas. `"continua": true`
  repete a referência da página anterior (ex.: página de costas e detalhes).
- **WhatsApp:** preencha `"whatsapp": "(85) 99999-9999"` em `loja`. Ele aparece em todas as
  páginas de produto, no "Como comprar" e na contracapa.
- **Nome, detalhe e cores:** campos `nome`, `detalhe` e `cores` de cada peça.
- **Enquadramento:** `foco` define o ponto da foto que fica no centro do corte
  (`"50% 30%"` = centro na horizontal, mais para cima na vertical).

Depois de editar, gere o PDF de novo:

```bash
cd catalogo
npm install playwright && npx playwright install chromium   # só na primeira vez
node build.cjs                       # PDF em alta definição
python3 ferramentas/gerar_web.py     # fotos leves (só se as fotos mudaram)
node build.cjs --whatsapp            # PDF leve
node build.cjs --png                 # também salva prévias em saida/previa/
```

## Fotos

- `fotos-originais/` guarda as 101 fotos recebidas, numeradas na ordem de envio (001 a 101).
  Duas vieram repetidas e entram uma vez só: **032 = 031** e **087 = 028**.
- `fotos-ajustadas/029.jpg` é a selfie 029 endireitada (chegou inclinada 45°).
- `fotos-hd/` tem as fotos ampliadas 2× com IA (Real-ESRGAN, `ferramentas/upscale.py`)
  para ficarem nítidas na impressão. As que vieram de print de tela tiveram a linha preta
  lateral removida (`ferramentas/aparar_bordas.py`).
- `fotos-web/` tem as versões leves usadas no PDF para WhatsApp.

A logo foi vetorizada (`marca/logo-mova.svg`) para ficar nítida em qualquer tamanho.
