// scripts/fix-aa-and-fill-names.js
// Executar: node scripts/fix-aa-and-fill-names.js
const fs = require("fs");
const path = require("path");

const possibleNames = ["aa.json","acf.json","aa","acf"];
const dataDir = path.join(process.cwd(), "src", "data");

// tentativa de localizar o arquivo aa.json ou acf.json
let inPath = null;
for (const n of possibleNames) {
  const p = path.join(dataDir, n);
  if (fs.existsSync(p)) {
    inPath = p;
    break;
  }
}
if (!inPath) {
  console.error("ERRO: não encontrei aa.json nem acf.json em src/data/");
  console.error("Coloque seu arquivo aa.json (Almeida Atualizada) em src/data/ e rode novamente.");
  process.exit(1);
}

const outPath = path.join(dataDir, "bible.json");
const raw = fs.readFileSync(inPath, "utf8");

// função para separar objetos por balanceamento de chaves
function splitObjects(text) {
  let objs = [];
  let buf = "";
  let balance = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buf += ch;
    if (ch === '"' && !escape) inString = !inString;
    if (ch === "\\" && !escape) escape = true;
    else escape = false;
    if (!inString) {
      if (ch === "{") balance++;
      else if (ch === "}") {
        balance--;
        if (balance === 0) {
          objs.push(buf.trim());
          buf = "";
        }
      }
    }
  }
  return objs;
}

// 1) tentar parsear como array primeiro
let arr = null;
try {
  arr = JSON.parse(raw);
  if (!Array.isArray(arr)) {
    throw new Error("JSON root não é array");
  }
} catch (e) {
  console.log("Arquivo não é um array JSON válido. Tentando separar blocos...");
  let objs = splitObjects(raw);
  if (objs.length === 0) {
    console.error("Nenhum bloco JSON detectado. Verifique o arquivo.");
    process.exit(2);
  }
  arr = objs.map((txt, i) => {
    let clean = txt.trim();
    // remover vírgulas iniciais que podem existir
    while (clean.startsWith(",")) clean = clean.slice(1).trim();
    // remover BOMs invisíveis
    if (clean.charCodeAt(0) === 0xfeff) clean = clean.slice(1);
    try {
      return JSON.parse(clean);
    } catch (err) {
      console.error("Erro ao parsear bloco", i, "-> trecho inicial do bloco:");
      console.error(clean.slice(0, 400));
      console.error(err.message);
      process.exit(3);
    }
  });
}

// mapa de abreviações -> nomes em PT-BR (estendido)
const nameMap = {
  "gn": "Gênesis","ex":"Êxodo","lv":"Levítico","nm":"Números","dt":"Deuteronômio",
  "js":"Josué","jg":"Juízes","rt":"Rute","1sm":"1 Samuel","2sm":"2 Samuel",
  "1ks":"1 Reis","2ks":"2 Reis","1cr":"1 Crônicas","2cr":"2 Crônicas",
  "ed":"Esdras","ne":"Neemias","et":"Ester","jó":"Jó","ps":"Salmos","pv":"Provérbios",
  "ec":"Eclesiastes","ct":"Cantares","is":"Isaías","jr":"Jeremias","lm":"Lamentações",
  "ez":"Ezequiel","dn":"Daniel","os":"Oseias","jl":"Joel","am":"Amós","ob":"Obadias",
  "jn":"Jonas","mq":"Miquéias","na":"Naum","hc":"Habacuque","sf":"Sofonias",
  "ag":"Ageu","zc":"Zacarias","ml":"Malaquias","mt":"Mateus","mc":"Marcos",
  "lc":"Lucas","jo":"João","atos":"Atos","rm":"Romanos","1co":"1 Coríntios",
  "2co":"2 Coríntios","gl":"Gálatas","ef":"Efésios","fp":"Filipenses","cl":"Colossenses",
  "1ts":"1 Tessalonicenses","2ts":"2 Tessalonicenses","1tm":"1 Timóteo","2tm":"2 Timóteo",
  "tt":"Tito","fm":"Filemom","hb":"Hebreus","tg":"Tiago","1pe":"1 Pedro","2pe":"2 Pedro",
  "1jo":"1 João","2jo":"2 João","3jo":"3 João","jd":"Judas","ap":"Apocalipse","pss":"Salmos"
};

function findName(abbrev) {
  if (!abbrev) return null;
  const key = String(abbrev).toLowerCase().replace(/[^a-z0-9]/g,"");
  if (nameMap[key]) return nameMap[key];
  // heurística: se abreviação for 1-4 letras e não estiver no mapa, capitalize
  if (key.length <= 4) return key.charAt(0).toUpperCase() + key.slice(1);
  return key;
}

// preencher nome quando faltar
const missingNames = [];
const fixed = arr.map((bk, idx) => {
  const book = Object.assign({}, bk);
  if ((!book.name || book.name === "") && book.abbrev) {
    book.name = findName(book.abbrev);
    missingNames.push({ idx: idx+1, abbrev: book.abbrev, filled: book.name });
  }
  // garantir chapters como array
  if (!Array.isArray(book.chapters)) book.chapters = [];
  return book;
});

// ordenar por ordem canônica mínima (usando abbrev)
const canonicalOrder = ["gn","ex","lv","nm","dt","js","jg","rt","1sm","2sm","1ks","2ks",
"1cr","2cr","ed","ne","et","jó","ps","pv","ec","ct","is","jr","lm","ez","dn","os","jl",
"am","ob","jn","mq","na","hc","sf","ag","zc","ml","mt","mc","lc","jo","atos","rm","1co",
"2co","gl","ef","fp","cl","1ts","2ts","1tm","2tm","tt","fm","hb","tg","1pe","2pe",
"1jo","2jo","3jo","jd","ap"];

function orderIndex(book) {
  if (!book || !book.abbrev) return 9999;
  const key = String(book.abbrev).toLowerCase().replace(/[^a-z0-9]/g,"");
  const idx = canonicalOrder.indexOf(key);
  return idx === -1 ? 9999 : idx;
}
fixed.sort((a,b) => orderIndex(a) - orderIndex(b));

// grava arquivo final
fs.writeFileSync(outPath, JSON.stringify(fixed, null, 2), "utf8");
console.log("Arquivo gerado:", outPath, " — livros processados:", fixed.length);
if (missingNames.length) {
  console.log("Foram preenchidos nomes para livros sem 'name' original (exemplo até 12):");
  console.table(missingNames.slice(0,12));
}

// mostrar os primeiros 8 livros para inspeção
console.log("Primeiros 8 livros (nome — abreviação — capítulos):");
fixed.slice(0,8).forEach((b,i) => {
  console.log(`${i+1}. ${b.name || "(sem nome)"} — ${b.abbrev || "(sem abbrev)"} — ${b.chapters ? b.chapters.length : 0} caps`);
});
