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
];
export const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i;

export async function getContacts(): Promise<Contact[]> {
  const saved = await controlStore().get("mail_contacts", { type: "json" }) as Contact[] | null;
  return Array.isArray(saved) ? saved : DEFAULT;
}

