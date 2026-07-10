/* =====================================================================
   CATÁLOGO DE PRODUTOS (conteúdo fictício)
   ---------------------------------------------------------------------
   Substitua pelos produtos reais da loja. Cada produto tem:
     id        -> identificador único (não repita)
     nome      -> nome exibido
     categoria -> uma das categorias em CATEGORIAS (abaixo)
     preco     -> número (use ponto para centavos: 129.90)
     precoDe   -> preço "de" para mostrar desconto (opcional, 0 = sem desconto)
     tamanhos  -> lista de tamanhos disponíveis
     cor       -> cor principal (usada só no placeholder da imagem)
     descricao -> texto curto do produto
     imagem    -> URL de imagem real (opcional). Se vazio, gera um placeholder.
   ===================================================================== */

window.CATEGORIAS = [
  "Leggings",
  "Tops",
  "Conjuntos",
  "Shorts",
  "Regatas",
  "Acessórios",
];

window.PRODUTOS = [
  {
    id: 1,
    nome: "Legging Power Cintura Alta",
    categoria: "Leggings",
    preco: 139.9,
    precoDe: 179.9,
    tamanhos: ["P", "M", "G", "GG"],
    cor: "#8b687e",
    descricao: "Tecido compressão com cós alto que modela e não marca. Ideal para musculação.",
    imagem: "",
  },
  {
    id: 2,
    nome: "Legging Texturizada Fizz",
    categoria: "Leggings",
    preco: 149.9,
    precoDe: 0,
    tamanhos: ["P", "M", "G", "GG"],
    cor: "#7c5a70",
    descricao: "Textura franzida efeito bumbum turbinado, com toque seco e respirável.",
    imagem: "",
  },
  {
    id: 3,
    nome: "Top Cropped Sustentação Média",
    categoria: "Tops",
    preco: 79.9,
    precoDe: 0,
    tamanhos: ["P", "M", "G", "GG"],
    cor: "#a67c96",
    descricao: "Bojo removível e costas nadador. Conforto para treinos de média intensidade.",
    imagem: "",
  },
  {
    id: 4,
    nome: "Top Alça Larga Confort",
    categoria: "Tops",
    preco: 69.9,
    precoDe: 89.9,
    tamanhos: ["P", "M", "G"],
    cor: "#b98aa6",
    descricao: "Alças largas que não machucam o ombro. Perfeito para yoga e pilates.",
    imagem: "",
  },
  {
    id: 5,
    nome: "Conjunto Move Legging + Top",
    categoria: "Conjuntos",
    preco: 219.9,
    precoDe: 259.9,
    tamanhos: ["P", "M", "G", "GG"],
    cor: "#9c7089",
    descricao: "Conjunto coordenado legging cintura alta + top. Combinação pronta para arrasar.",
    imagem: "",
  },
  {
    id: 6,
    nome: "Conjunto Short + Cropped Neon",
    categoria: "Conjuntos",
    preco: 189.9,
    precoDe: 0,
    tamanhos: ["P", "M", "G"],
    cor: "#6e5162",
    descricao: "Short de compressão + cropped em cor vibrante. Leve e fresquinho para o verão.",
    imagem: "",
  },
  {
    id: 7,
    nome: "Short Ciclista Cintura Alta",
    categoria: "Shorts",
    preco: 89.9,
    precoDe: 0,
    tamanhos: ["P", "M", "G", "GG"],
    cor: "#8b687e",
    descricao: "Comprimento na coxa, com bolso lateral para o celular. Não transparece.",
    imagem: "",
  },
  {
    id: 8,
    nome: "Short Saia Fitness",
    categoria: "Shorts",
    preco: 99.9,
    precoDe: 119.9,
    tamanhos: ["P", "M", "G"],
    cor: "#a67c96",
    descricao: "Short com sobreposição em saia. Elegância para o treino funcional e o dia a dia.",
    imagem: "",
  },
  {
    id: 9,
    nome: "Regata Dry Respirável",
    categoria: "Regatas",
    preco: 59.9,
    precoDe: 0,
    tamanhos: ["P", "M", "G", "GG"],
    cor: "#b98aa6",
    descricao: "Tecido dry que afasta o suor da pele, mantendo você sequinha do começo ao fim.",
    imagem: "",
  },
  {
    id: 10,
    nome: "Regata Cavada Basic",
    categoria: "Regatas",
    preco: 54.9,
    precoDe: 0,
    tamanhos: ["P", "M", "G"],
    cor: "#7c5a70",
    descricao: "Corte cavado clássico para deixar o top à mostra. Peça-curinga do guarda-roupa.",
    imagem: "",
  },
  {
    id: 11,
    nome: "Faixa de Cabelo Antisuor",
    categoria: "Acessórios",
    preco: 24.9,
    precoDe: 0,
    tamanhos: ["Único"],
    cor: "#9c7089",
    descricao: "Absorve o suor e prende a franja. Antiderrapante, não escorrega no treino.",
    imagem: "",
  },
  {
    id: 12,
    nome: "Meião de Compressão Fitness",
    categoria: "Acessórios",
    preco: 39.9,
    precoDe: 49.9,
    tamanhos: ["P/M", "G/GG"],
    cor: "#6e5162",
    descricao: "Compressão graduada que melhora a circulação e reduz a fadiga nas pernas.",
    imagem: "",
  },
];
