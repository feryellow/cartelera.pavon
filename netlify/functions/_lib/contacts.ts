import { controlStore } from "./store.ts";

// Agenda de destinatarios para los correos de la app (confirmación de montaje, etc.).
// Se guarda en el servidor, no en archivos públicos de la web.
export type Contact = { name: string; email: string };
const DEFAULT: Contact[] = [
  { name: "Milena Cervantes", email: "milena@laestacion.com" },
  { name: "Celia Del Barrio", email: "celia@yellowmedia.es" },
  { name: "Pablo Benavente", email: "jefedesala@granteatropavon.com" },
  { name: "Miguel Agramonte Araiz", email: "direcciontecnica@granteatropavon.com" },
  { name: "Amanda del Monte", email: "amanda@laestacion.com" },
  { name: "Sandra Minguela", email: "gerencia@granteatropavon.com" },
  { name: "Taquilla Gran Teatro Pavón", email: "taquilla@granteatropavon.com" },
  { name: "Juan Carlos Cueto Luardo", email: "cueto@abonoteatro.com" },
  { name: "Ana Álvarez (Abonoteatro)", email: "ana.alvarez@abonoteatro.com" },
  { name: "Luis Álvarez", email: "luis@wonderlandgroup.es" },
  { name: "Cristina (La Estación)", email: "cristina@laestacion.com" },
];
export const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i;

// La agenda guardada manda; los contactos fijos que falten se añaden salvo que se hayan quitado a propósito.
export async function getContacts(): Promise<Contact[]> {
  const saved = await controlStore().get("mail_contacts", { type: "json" }) as Contact[] | null;
  if (!Array.isArray(saved)) return DEFAULT;
  const removed = new Set(((await controlStore().get("mail_contacts_removed", { type: "json" }) as string[] | null) || []).map((x) => x.toLowerCase()));
  const have = new Set(saved.map((c) => c.email.toLowerCase()));
  return [...saved, ...DEFAULT.filter((c) => !have.has(c.email) && !removed.has(c.email))];
}
export const DEFAULT_EMAILS = () => DEFAULT.map((c) => c.email);

