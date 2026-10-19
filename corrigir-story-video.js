// Corrige: vídeo não aparecia na galeria ao postar story.
// Causa: o campo único accept="image/*,video/*" faz alguns seletores (WebView/Android)
// listarem só fotos. Agora o story pergunta Foto ou Vídeo e abre o seletor certo.
const fs = require("fs");
const dir = process.argv[2] || ".";
const f = dir + "/index.html";
let s = fs.readFileSync(f, "utf8");
fs.copyFileSync(f, f + ".bak-storyvideo");

function troca(de, para, esperado) {
  const n = s.split(de).length - 1;
  if (n !== esperado) { console.error("FALHOU: esperado " + esperado + " ocorrência(s), achei " + n + " -> " + de.slice(0, 60)); process.exit(1); }
  s = s.split(de).join(para);
}

// 1) função do seletor Foto/Vídeo
const fn = `// Abre um menu Foto/Vídeo e só então o seletor com o tipo certo (evita galeria sem vídeos)
function abrirSeletorStory() {
  var fi = document.querySelector("#story-file-input");
  if (!fi) return;
  var velho = document.getElementById("story-pick-sheet");
  if (velho) velho.remove();
  var ov = document.createElement("div");
  ov.id = "story-pick-sheet";
  ov.style.cssText = "position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;";
  var btn = "border:0;border-radius:16px;padding:14px;font-size:16px;font-weight:700;font-family:inherit;cursor:pointer;";
  ov.innerHTML = '<div style="width:100%;max-width:480px;background:#fff;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:10px;">' +
    '<button data-pick="image" style="' + btn + 'background:#ff6fa5;color:#fff;">Foto</button>' +
    '<button data-pick="video" style="' + btn + 'background:#ff6fa5;color:#fff;">Vídeo</button>' +
    '<button data-pick="cancel" style="' + btn + 'background:#f3f3f3;color:#555;">Cancelar</button></div>';
  ov.addEventListener("click", function(e) {
    var b = e.target.closest("[data-pick]");
    if (b && b.getAttribute("data-pick") !== "cancel") {
      fi.accept = b.getAttribute("data-pick") === "video" ? "video/*" : "image/*";
      ov.remove();
      fi.click();
      return;
    }
    if (b || e.target === ov) ov.remove();
  });
  document.body.appendChild(ov);
}

function bindStoriesEvents() {`;
troca("function bindStoriesEvents() {", fn, 1);

// 2) os dois pontos que abriam o seletor direto
troca("if (fileInput) fileInput.click();", "abrirSeletorStory();", 2);
troca('var storyInput = document.querySelector("#story-file-input");\n        if (storyInput) storyInput.click();', "abrirSeletorStory();", 1);

// 3) detectar vídeo também pela extensão (arquivos sem MIME)
troca('var isVideo = file.type.indexOf("video") === 0;\n      if (isVideo) {\n        // Vídeo grande demais',
      'var isVideo = file.type.indexOf("video") === 0 || /\\.(mp4|mov|m4v|webm|3gp|mkv)$/i.test(file.name || "");\n      if (isVideo) {\n        // Vídeo grande demais', 1);

// 4) versão
const m = s.match(/var APP_VERSION = "(\d{4}\.\d{2}\.\d{2})\.(\d+)";/);
if (!m) { console.error("APP_VERSION não achada"); process.exit(1); }
const novo = m[1] + "." + String(parseInt(m[2], 10) + 1).padStart(2, "0");
troca(m[0], 'var APP_VERSION = "' + novo + '";', 1);
fs.writeFileSync(f, s);
fs.writeFileSync(dir + "/version.json", JSON.stringify({ version: novo }, null, 2) + "\n");
console.log("OK -> versão " + novo);
