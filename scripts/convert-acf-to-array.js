// scripts/convert-acf-to-array.js
// Executar com: node scripts/convert-acf-to-array.js
const fs = require("fs");
const path = require("path");

const inPath = path.join(process.cwd(), "src", "data", "acf.json");
const outPath = path.join(process.cwd(), "src", "data", "bible.json");

if (!fs.existsSync(inPath)) {
  console.error("Arquivo não encontrado:", inPath);
  console.error("Coloque seu acf.json em src/data/acf.json antes de rodar este script.");
  process.exit(1);
}

const s = fs.readFileSync(inPath, "utf8");

// separar objetos por balanceamento de chaves (mantendo strings corretamente)
let objs = [];
let buf = "";
let balance = 0;
let inString = false;
let escape = false;

for (let i = 0; i < s.length; i++) {
  const ch = s[i];
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

if (objs.length === 0) {
  console.error("Nenhum objeto encontrado no arquivo. Verifique o formato do acf.json");
  process.exit(2);
}

// limpar objetos (remover vírgulas iniciais, BOMs, etc) e parsear
const parsed = objs.map((txt, i) => {
  let clean = txt.trim();
  // remover vírgulas ou vírgulas+quebras no começo — isso é o que causou seu erro
  while (clean.startsWith(",")) {
    clean = clean.slice(1).trim();
  }
  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error("Erro ao parsear objeto", i, ":", err.message);
    // mostrar início e fim do trecho problemático para debugging
    console.error("Trecho problemático (primeiros 300 chars):\n", clean.slice(0, 300));
    process.exit(3);
  }
});

fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2), "utf8");
console.log("Convertido com sucesso:", outPath, " (", parsed.length, "objetos )");
