// ajustar-capa.js — enquadramento adaptativo da capa do perfil (MIMI)
// Uso: node ajustar-capa.js .
// Só mexe na EXIBIÇÃO da capa. Não altera upload, dados, nem nenhuma outra função.
const fs = require("fs");
const path = require("path");
const os = require("os");

const dir = path.resolve(process.argv[2] || ".");
function falhou(m) { console.log("FALHOU: " + m); process.exit(1); }

const fIndex = path.join(dir, "index.html");
const fVer = path.join(dir, "version.json");
if (!fs.existsSync(fIndex)) falhou("index.html não encontrado em " + dir);

let html = fs.readFileSync(fIndex, "utf8");
if (html.indexOf('class="profile-cover"') < 0) falhou("não achei a capa do perfil no index.html");
if (html.lastIndexOf("</body>") < 0) falhou("não achei </body> no index.html");

const MARK_I = "<!-- MIMI-CAPA-INICIO -->";
const MARK_F = "<!-- MIMI-CAPA-FIM -->";

const CSS = `
.profile-cover.cv-on{isolation:isolate;transition:height .25s ease}
.profile-cover .cv-wrap{position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;z-index:-1;pointer-events:none}
.profile-cover .cv-bd{position:absolute;top:-24px;left:-24px;right:-24px;bottom:-24px;background-size:cover;background-position:center;background-repeat:no-repeat;filter:blur(22px) saturate(1.15)}
.profile-cover .cv-fg{position:absolute;top:0;left:0;right:0;bottom:0;background-repeat:no-repeat}
`;

const JS = `
(function () {
  if (window.__mimiCapaAdapt) return;
  window.__mimiCapaAdapt = true;

  var MINH = 150;      // altura mínima (a mesma de antes)
  var MAXCROP = 0.28;  // no máximo 28% da foto pode ser cortada
  var cache = {}, cacheKeys = [];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ponto de interesse da foto: onde há mais detalhe/contraste
  function measure(img, cors) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) return null;
    var r = { w: iw, h: ih, fx: 0.5, fy: 0.42 };
    if (cors) {
      try {
        var gw = 64, gh = clamp(Math.round(64 * ih / iw), 8, 128);
        var cv = document.createElement("canvas");
        cv.width = gw; cv.height = gh;
        var cx = cv.getContext("2d");
        cx.drawImage(img, 0, 0, gw, gh);
        var d = cx.getImageData(0, 0, gw, gh).data;
        var L = new Float32Array(gw * gh), i, x, y;
        for (i = 0; i < gw * gh; i++) L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
        var sx = 0, sy = 0, sw = 0;
        for (y = 1; y < gh - 1; y++) {
          for (x = 1; x < gw - 1; x++) {
            var gx = L[y * gw + x + 1] - L[y * gw + x - 1];
            var gy = L[(y + 1) * gw + x] - L[(y - 1) * gw + x];
            var m = gx * gx + gy * gy;
            sx += m * (x + 0.5) / gw; sy += m * (y + 0.5) / gh; sw += m;
          }
        }
        if (sw > 0) {
          r.fx = clamp(0.35 * 0.5 + 0.65 * (sx / sw), 0.15, 0.85);
          r.fy = clamp(0.35 * 0.42 + 0.65 * (sy / sw), 0.15, 0.85);
        }
      } catch (e) {}
    }
    return r;
  }

  function analyze(url, cb) {
    var c = cache[url];
    if (c && c.done) { cb(c.info); return; }
    if (c) { c.q.push(cb); return; }
    c = cache[url] = { done: false, info: null, q: [cb] };
    cacheKeys.push(url);
    if (cacheKeys.length > 30) { delete cache[cacheKeys.shift()]; }
    function fim(info) {
      c.done = true; c.info = info;
      var q = c.q; c.q = [];
      for (var i = 0; i < q.length; i++) q[i](info);
    }
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () { fim(measure(img, true)); };
    img.onerror = function () {
      var i2 = new Image();
      i2.onload = function () { fim(measure(i2, false)); };
      i2.onerror = function () { fim(null); };
      i2.src = url;
    };
    img.src = url;
  }

  function layers(el) {
    var w = el._cvWrap;
    if (w && w.parentNode === el) return w;
    w = document.createElement("div");
    w.className = "cv-wrap";
    w.innerHTML = '<div class="cv-bd"></div><div class="cv-fg"></div>';
    el.insertBefore(w, el.firstChild);
    el._cvWrap = w;
    el._cvKey = "";
    return w;
  }

  function layout(el, info) {
    var W = el.clientWidth || el.offsetWidth;
    if (!W) return;
    var iw = info.w, ih = info.h, r = iw / ih;
    var maxH = Math.min(340, Math.round(W * 0.68));
    var H = Math.round(clamp(W / r, MINH, maxH));
    var sc = Math.min(W / iw, H / ih);   // foto inteira dentro da moldura
    var sv = Math.max(W / iw, H / ih);   // moldura toda preenchida
    var s = Math.max(sc, Math.min(sv, sc / (1 - MAXCROP)));
    var dw = iw * s, dh = ih * s;
    var ox = dw <= W ? (W - dw) / 2 : clamp(W / 2 - info.fx * dw, W - dw, 0);
    var oy = dh <= H ? (H - dh) / 2 : clamp(H / 2 - info.fy * dh, H - dh, 0);
    var sobra = (dw < W - 0.5) || (dh < H - 0.5);
    var key = [H, dw.toFixed(1), dh.toFixed(1), ox.toFixed(1), oy.toFixed(1), sobra ? 1 : 0].join("|");
    var w = layers(el);
    if (el._cvKey === key) return;
    el._cvKey = key;
    el.classList.add("cv-on");
    el.style.height = H + "px";
    var bd = w.firstChild, fg = w.lastChild;
    fg.style.backgroundImage = el._cvUrlRaw;
    fg.style.backgroundSize = dw + "px " + dh + "px";
    fg.style.backgroundPosition = ox + "px " + oy + "px";
    bd.style.backgroundImage = el._cvUrlRaw;
    bd.style.display = sobra ? "block" : "none";
  }

  function process(el) {
    if (el.querySelector("video")) return;
    var raw = el.style.backgroundImage;
    var m = raw && raw.match(/url\\(\\s*["']?([\\s\\S]*?)["']?\\s*\\)/);
    if (!m) return;
    var url = m[1];
    if (el._cvUrl === url) {
      if (el._cvInfo) layout(el, el._cvInfo);
      return;
    }
    el._cvUrl = url; el._cvUrlRaw = raw; el._cvInfo = null; el._cvKey = "";
    analyze(url, function (info) {
      if (el._cvUrl !== url || !info) return;
      el._cvInfo = info;
      layout(el, info);
      if (window.ResizeObserver && !el._cvRO) {
        el._cvRO = new ResizeObserver(function () { if (el._cvInfo) layout(el, el._cvInfo); });
        el._cvRO.observe(el);
      }
    });
  }

  var t = null;
  function scan() {
    t = null;
    var els = document.querySelectorAll(".profile-cover");
    for (var i = 0; i < els.length; i++) { try { process(els[i]); } catch (e) {} }
  }
  function sched() { if (!t) t = setTimeout(scan, 40); }

  new MutationObserver(sched).observe(document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ["style", "data-bgpath"]
  });
  scan();
})();
`;

// confere a sintaxe do JS antes de gravar qualquer coisa
try { new Function(JS); } catch (e) { falhou("erro de sintaxe no módulo da capa: " + e.message); }

// versão atual
const reVer = /(APP_VERSION\s*[:=]\s*)(["'])(\d{4}\.\d{2}\.\d{2}\.\d{2})\2/;
const mv = html.match(reVer);
if (!mv) falhou("não achei APP_VERSION no index.html");
const velha = mv[3];
const d = new Date();
const p2 = (n) => String(n).padStart(2, "0");
const hoje = d.getFullYear() + "." + p2(d.getMonth() + 1) + "." + p2(d.getDate());
let nova;
if (velha.indexOf(hoje + ".") === 0) nova = hoje + "." + p2(parseInt(velha.slice(-2), 10) + 1);
else nova = hoje + ".01";

// backup (nunca sobrescreve um backup antigo)
let bk = path.join(os.homedir(), "index-backup-antes-capa.html");
for (let n = 2; fs.existsSync(bk); n++) bk = path.join(os.homedir(), "index-backup-antes-capa-" + n + ".html");
fs.writeFileSync(bk, html);

// remove versão anterior do bloco (permite rodar de novo)
const a = html.indexOf(MARK_I), b = html.indexOf(MARK_F);
if (a >= 0 && b > a) html = html.slice(0, a) + html.slice(b + MARK_F.length);

const bloco = MARK_I + "\n<style>" + CSS + "</style>\n<script>" + JS + "</script>\n" + MARK_F + "\n";
const pos = html.lastIndexOf("</body>");
html = html.slice(0, pos) + bloco + html.slice(pos);
html = html.replace(reVer, "$1$2" + nova + "$2");
fs.writeFileSync(fIndex, html);

// version.json
let vj = null;
if (fs.existsSync(fVer)) vj = fs.readFileSync(fVer, "utf8");
if (vj && vj.indexOf(velha) >= 0) vj = vj.split(velha).join(nova);
else vj = JSON.stringify({ version: nova }) + "\n";
fs.writeFileSync(fVer, vj);

console.log("OK -> versão " + nova + " (backup: " + bk + ")");
