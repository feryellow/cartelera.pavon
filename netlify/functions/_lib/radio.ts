import { listRecords } from "./records.ts";

// Control de inventario de Radio también en el servidor: el navegador ya avisa, pero aquí se
// comprueba con los datos guardados en ese momento (otro usuario puede haber asignado cuñas después
// de que abrieras la pantalla). Devuelve el mensaje de error o "" si la asignación es válida.
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const weekKey = (iso: string) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };

async function loadContracts(origin: string) {
  const r = await fetch(new URL("/data/radio-contracts.json", origin), { headers: { "cache-control": "no-cache" } });
  if (!r.ok) throw new Error("No se ha podido leer el inventario contractual de Radio");
  const d: any = await r.json();
  return (d.contracts || []) as any[];
}

export async function validateRadio(row: any, origin: string): Promise<string> {
  if (!row?.contractId || row.deletedAt) return "";
  const contract = (await loadContracts(origin)).find((c) => c.id === row.contractId);
  if (!contract) return "El acuerdo de radio seleccionado no existe.";
  const line = (contract.lines || []).find((l: any) => l.id === row.lineId);
  if (!line) return "Elige una emisora / programa del acuerdo.";
  const month = String(row.inventoryMonth || "");
  const capacity = n(line.monthly?.[month]);
  if (!capacity) return "Ese programa no tiene inventario contratado en el mes seleccionado.";
  const planned = n(row.plannedSpots);
  if (planned < 0 || !Number.isInteger(planned)) return "La cantidad planificada debe ser un número entero positivo.";
  const s = String(row.startDate || ""), e = String(row.endDate || "");
  if (s && s.slice(0, 7) !== month) return "La fecha de inicio debe estar dentro del mes de inventario.";
  if (e && e.slice(0, 7) !== month) return "La fecha de fin debe estar dentro del mismo mes. Divide la campaña en dos asignaciones si cruza de mes.";
  if (s && e && s > e) return "La fecha de fin no puede ser anterior al inicio.";
  if (s && e && weekKey(s) !== weekKey(e)) return "Una asignación no puede cruzar de semana. Divide el reparto en dos bloques.";
  const others = (await listRecords("radio")).filter((r: any) => r.id !== row.id && r.contractId === row.contractId && r.inventoryMonth === month && r.lineId === row.lineId);
  const remaining = capacity - others.reduce((a: number, r: any) => a + n(r.plannedSpots), 0);
  if (planned > remaining) return `Supera el inventario disponible: quedan ${Math.max(0, remaining)} ${line.unit} en ${line.station} · ${line.program}. Recarga la página para ver las asignaciones actuales.`;
  return "";
}
