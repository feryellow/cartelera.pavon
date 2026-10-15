import { weekStatus } from "./status.ts";
import { listRecords } from "./records.ts";
import { listDiseno, OPEN as DISENO_OPEN } from "./diseno.ts";
import { madridToday, daysBetween } from "./dates.ts";

// STATUS ENGINE · única fuente de verdad de «qué debería existir, qué existe y qué falta».
// Lo usan la Home («Necesita atención»), el correo diario, el aviso al móvil y la sección Status.
// Reglas: si algo está bien no aparece; cada incidencia apunta a su registro; sin duplicados.
//   FALTA    (severity "error")   → hueco real: cuñas sin programar, soporte sin campaña, material ausente,
//                                   posición de Home Ticket vacía, página sin decidir, cartel sin relevo,
//                                   material fuera de plazo, pieza de diseño vencida.
//   ATENCIÓN (severity "warning") → vence hoy o mañana y todavía no está.
export type Issue = {
  id: string;
  section: string;            // radio, taxis, intercambiadores, hometicket, revistas, carteleria, material, diseno
  sectionName: string;
  severity: "error" | "warning";
  state: "FALTA" | "ATENCIÓN";
  title: string;              // qué: «Pavón · Kiss FM», «Intercambiadores · Moncloa»
  issue: string;              // el problema en pocas palabras: «Faltan 8 cuñas», «Falta material»
  detail: string;
  spectacle: string;
  date: string;               // YYYY-MM-DD (fecha relevante: inicio, entrega, retirada…); vacío si es de toda la semana
  period: string;             // «Semana del 12 al 18 de octubre» cuando la incidencia es de la semana y no de un día
  time: string;               // HH:MM si existe
  thumbnail: { kind: "asset" | "cart"; key: string; module?: string } | null;
  fallback: string;           // imagen estática de la campaña si no hay miniatura propia
  logo: { src: string; bg: string } | null; // logo del proveedor o medio (Kiss FM, Atresmedia, Clece, revistas)
  sourceId: string;
  link: string;               // ruta de la app que abre el registro de origen
};
export type EngineResult = { today: string; week: { first: string; last: string; label: string }; total: number; errors: number; warnings: number; issues: Issue[]; sections: { key: string; name: string; count: number }[] };

const NAMES: Record<string, string> = { radio: "Radio", taxis: "Taxis", intercambiadores: "Intercambiadores", hometicket: "Home Ticket", revistas: "Revistas", carteleria: "Cartelería", material: "Material", diseno: "Diseño" };
const ORDER = ["carteleria", "radio", "intercambiadores", "taxis", "hometicket", "revistas", "material", "diseno"];
const RECEIVED = ["recibido", "entregado", "listo"];
const MATERIAL_MODULES = [["radio", "Radio"], ["taxis", "Taxis"], ["intercambiadores", "Intercambiadores"], ["hometicket", "Home Ticket"], ["revistas", "Revistas"]] as const;

// Portadas estáticas de campañas conocidas, para cuando el registro no tiene imagen propia
const STATIC: [RegExp, string][] = [
  [/PEGADOS/, "/assets/campanas/pegados.jpg"], [/101 DALMATAS|CRUELLA/, "/assets/campanas/cruella-teaser.jpg"],
  [/LOCURAS PARALELAS/, "/assets/campanas/locuras-paralelas-octubre.jpg"], [/IMITADOR/, "/assets/campanas/el-imitador.jpg"],
  [/BESTSELLER|BEST SELLER/, "/assets/campanas/best-seller.jpg"], [/EVA SORIANO/, "/assets/campanas/eva-soriano-septiembre.jpg"],
  [/PATRICIA DONN/, "/assets/campanas/patricia-donn.jpg"],
];
// Logos de proveedores y medios (los mismos del portal de proveedores), con su fondo
const LOGOS: [RegExp, string, string][] = [
  [/KISS/, "/assets/proveedores/kiss-fm.png", "#1d070c"],
  [/ONDA CERO|EUROPA FM|MELODIA|ATRESMEDIA/, "/assets/proveedores/atresmedia-mark.png", "#ffffff"],
  [/AESCENA/, "/assets/proveedores/aescena.png", "#241e20"],
  [/GODOT/, "/assets/proveedores/godot.png", "#ffffff"],
  [/TEATROS/, "/assets/proveedores/revista-teatros.png", "#ffffff"],
  [/MEDIASET/, "/assets/tv/mediaset.png", "#ffffff"],
];
// Logos de los teatros y espacios del grupo (cuando no hay proveedor o medio que mostrar)
const VENUES: [RegExp, string][] = [
  [/PRINCIPE PIO|LA ESTACION|CAIXABANK|GTCPP/, "principe-pio"], [/PAVON|GTP\b/, "pavon"], [/SERRANO/, "serrano"],
  [/ARLEQUIN/, "arlequin"], [/PEDRAZA|CASTILLO/, "pedraza"], [/ABONOTEATRO|ABONO TEATRO/, "abonoteatro"],
];
export const YELLOW_LOGO = { src: "/yellow-app-icon-180.png", bg: "#FFD400" };
/** Proveedor o medio primero (Kiss FM, Atresmedia, Clece, revistas); si no, el teatro; si no, null (la app pone la pieza o el logo de Yellow). */
export function logoFor(section: string, text: string) {
  const t = String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (section === "intercambiadores") return { src: "/assets/proveedores/clece.png", bg: "linear-gradient(135deg,#d33ec3,#652b96)" };
  if (section === "radio" || section === "revistas" || section === "material") { const m = LOGOS.find(([re]) => re.test(t)); if (m) return { src: m[1], bg: m[2] }; }
  const v = VENUES.find(([re]) => re.test(t));
  return v ? { src: `/assets/venues/logo-${v[1]}.png`, bg: "#ffffff" } : null;
}
export function fallbackImage(text: string) {
  const t = String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  return STATIC.find(([re]) => re.test(t))?.[1] || "";
}

export async function collectIssues(opts: { origin: string; today?: string; sections?: (s: string) => boolean }): Promise<EngineResult> {
  const today = opts.today || madridToday();
  const allow = opts.sections || (() => true);
  const out = new Map<string, Issue>();
  const add = (i: Omit<Issue, "id" | "sectionName" | "state" | "fallback" | "period"> & { id?: string; period?: string }) => {
    if (!allow(i.section)) return;
    const id = i.id || `${i.section}:${i.sourceId}`;
    const prev = out.get(id);
    if (prev && (prev.severity === "error" || i.severity === "warning")) return; // se queda la más grave
    const bare = (t: string) => t.toLowerCase().replace(/\b(la|el|los|las)\s/g, "").trim();
    const detail = bare(i.detail) === bare(i.issue) ? "" : i.detail.startsWith(i.issue) ? i.detail.slice(i.issue.length).replace(/^\s*·\s*/, "") : i.detail;
    out.set(id, { ...i, detail, period: i.period || "", id, sectionName: NAMES[i.section] || i.section, state: i.severity === "error" ? "FALTA" : "ATENCIÓN", fallback: fallbackImage(`${i.spectacle} ${i.title}`), logo: logoFor(i.section, `${i.title} ${i.detail} ${i.spectacle}`) });
  };

  // 1. Lo que debería existir esta semana frente a lo programado (misma lógica que la sección Status)
  const week = await weekStatus(today, opts.origin);
  for (const sec of week.sections) for (const it of sec.items) {
    if (it.state !== "falta") continue;
    const section = it.module || sec.key;
    add({ section, severity: "error", title: it.sourceId === "none" ? (NAMES[section] || sec.name) : it.title, period: it.date ? "" : section === "revistas" ? "" : week.label, issue: it.issue || "Falta", detail: it.detail, spectacle: it.spectacle || "", date: it.date || "", time: it.time || "", thumbnail: it.img || null, sourceId: it.sourceId || `${sec.key}:${it.title}`, link: it.link || `#${sec.key}` });
  }

  // 2. Material con fecha de entrega: fuera de plazo (FALTA) o vence hoy/mañana (ATENCIÓN)
  for (const [m, label] of MATERIAL_MODULES) {
    if (!allow(m) && !allow("material")) continue;
    for (const r of await listRecords(m)) {
      if (!r.deliveryDate || RECEIVED.includes(String(r.materialStatus || "").toLowerCase()) || String(r.status || "").toLowerCase() === "finalizado") continue;
      if (r.endDate && r.endDate < today) continue; // campaña ya terminada: no es un hueco actual
      const d = daysBetween(today, r.deliveryDate);
      if (d > 1) continue;
      const where = (r.magazine === "Revista Teatros" ? "Teatros" : r.magazine) || r.station || r.location || r.support || r.position || "";
      add({ id: `${m}:${r.id}:material`, section: m, severity: d < 0 ? "error" : "warning", title: [label, where].filter(Boolean).join(" · "),
        issue: d < 0 ? `Material fuera de plazo (${-d} ${d === -1 ? "día" : "días"})` : d === 0 ? "Material: se entrega hoy" : "Material: se entrega mañana",
        detail: [r.spectacle || r.campaignName, r.venue, r.materialStatus ? "estado: " + r.materialStatus : "sin recibir"].filter(Boolean).join(" · "),
        spectacle: r.spectacle || "", date: r.deliveryDate, time: "", thumbnail: (r.assetKey || r.posterKey) ? { kind: "asset", key: r.posterKey || r.assetKey, module: m } : null, sourceId: r.id, link: `#${m}?edit=${r.id}` });
    }
  }

  // 3. Diseño: piezas abiertas vencidas (FALTA) o que vencen hoy (ATENCIÓN)
  if (allow("diseno")) {
    for (const r of await listDiseno()) {
      if (!DISENO_OPEN.includes(r.status) || !r.deadline) continue;
      const d = daysBetween(today, r.deadline);
      if (d > 0) continue;
      add({ section: "diseno", severity: d < 0 ? "error" : "warning", title: `${r.company || "Diseño"} · ${r.title}`.slice(0, 120),
        issue: d < 0 ? `Vencida hace ${-d} ${d === -1 ? "día" : "días"}` : "Vence hoy", detail: [r.requester ? "pide " + r.requester.charAt(0) + r.requester.slice(1).toLowerCase() : "", `avance ${r.progress || 0} %`, r.designerNotes || ""].filter(Boolean).join(" · "),
        spectacle: "", date: r.deadline, time: "", thumbnail: null, sourceId: r.id, link: `#diseno?edit=${r.id}` });
    }
  }

  const issues = [...out.values()].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1) || ORDER.indexOf(a.section) - ORDER.indexOf(b.section) || String(a.date).localeCompare(String(b.date)) || a.title.localeCompare(b.title));
  const sections = ORDER.map((k) => ({ key: k, name: NAMES[k], count: issues.filter((i) => i.section === k).length })).filter((s) => s.count);
  return { today, week: { first: week.first, last: week.last, label: week.label }, total: issues.length, errors: issues.filter((i) => i.severity === "error").length, warnings: issues.filter((i) => i.severity === "warning").length, issues, sections };
}
