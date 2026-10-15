// Comprobación antes de publicar (la ejecuta Netlify en cada despliegue). Si algo falla, el despliegue se para
// y la versión que funciona sigue publicada. Comprueba: sintaxis de todo el JavaScript del navegador, que la
// versión de app.js y la del service worker coinciden y que sw.js no está vacío y conserva los avisos al móvil.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
const fail = (m) => { console.error("✗ " + m); process.exitCode = 1; };
const files = ["site/app.js", "site/sw.js", "site/meta.js", "site/presupuesto.js", "site/identity-flow.js",
  ...["site/core", "site/modules"].flatMap((d) => existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".js")).map((f) => `${d}/${f}`) : [])].filter(existsSync);
for (const f of files) { try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); } catch (e) { fail(`${f}: ${String(e.stderr || e).split("\n").slice(0, 4).join(" ")}`); } }
const app = readFileSync("site/app.js", "utf8"), sw = readFileSync("site/sw.js", "utf8");
const v1 = /const YC_VERSION="([^"]+)"/.exec(app)?.[1], v2 = /const CACHE="([^"]+)"/.exec(sw)?.[1];
if (!v1 || v1 !== v2) fail(`Versiones distintas: app.js ${v1} · sw.js ${v2}`);
if (sw.length < 500) fail("sw.js está vacío o casi vacío");
if (!sw.includes('addEventListener("push"')) fail("sw.js ha perdido los avisos al móvil (listener push)");
const html = readFileSync("site/index.html", "utf8");
for (const src of [...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map((m) => m[1])) if (!existsSync("site" + src)) fail(`index.html carga ${src}, que no existe`);
if (!process.exitCode) console.log(`✓ ${files.length} archivos correctos · versión ${v1}`);
