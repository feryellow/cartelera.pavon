import type { Config } from "@netlify/functions";
import { takeSnapshot } from "./_lib/backup.ts";
import { recordHealth, adminAlert } from "./_lib/notify.ts";

// Copia de seguridad diaria (madrugada en Madrid). Si falla, queda en «Salud» y avisa al móvil de administración.
export default async () => {
  try {
    const m = await takeSnapshot("Copia diaria", Netlify.env.get("COMMIT_REF") || Netlify.context?.deploy?.id || "");
    await recordHealth("backup", true, `${m.id} · ${Object.values(m.stores).reduce((a, s) => a + s.keys, 0)} claves · ${Math.round(m.bytes / 1024)} KB${m.note ? " · " + m.note : ""}`);
    console.log(JSON.stringify({ backup: m.id, bytes: m.bytes }));
  } catch (err) {
    await recordHealth("backup", false, String(err));
    await adminAlert("backup", "La copia de seguridad diaria ha fallado");
    console.error("backup", String(err));
  }
};
export const config: Config = { schedule: "20 2 * * *" };
