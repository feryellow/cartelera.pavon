// Televisión · Mediaset España (Taquilla Mediaset). Datos de la propuesta de Alejandro Chamizo a Celia
// y de la planificación en PDF «PLANIFICACIÓN Taquilla Mediaset Yellow Media». Las condiciones
// económicas solo se envían a quien tiene acceso al presupuesto.
type Pass = [canal: string, franja: string, dia: string, hora: string, tarifa: number];
const plan: { canal: string; pases: Pass[] }[] = [
  { canal: "Telecinco", pases: [
    ["Telecinco", "Tarde", "Lunes", "18:00", 6500], ["Telecinco", "Mediodía", "Lunes", "14:00", 3000],
    ["Telecinco", "Mediodía premium", "Martes", "14:15", 5500], ["Telecinco", "Sobremesa extra", "Martes", "16:15", 6200],
    ["Telecinco", "Medianoche 1", "Miércoles", "00:45", 5000], ["Telecinco", "Sobremesa extra", "Miércoles", "16:45", 6200],
    ["Telecinco", "GN jueves", "Jueves", "22:00", 25500], ["Telecinco", "Sobremesa extra", "Jueves", "16:45", 6200],
    ["Telecinco", "Mediodía", "Viernes", "14:00", 3000], ["Telecinco", "Tarde", "Viernes", "18:00", 6500],
    ["Telecinco", "Tarde FS", "Sábado", "16:45", 7400], ["Telecinco", "Mediodía FS", "Sábado", "13:45", 3000],
    ["Telecinco", "Medianoche FS", "Domingo", "00:45", 4100], ["Telecinco", "Tarde FS", "Domingo", "16:45", 7400]] },
  { canal: "Cuatro", pases: [
    ["Cuatro", "Mediodía L-V", "Lunes", "14:00", 1400], ["Cuatro", "Medianoche 1", "Martes", "00:30", 1900],
    ["Cuatro", "Mediodía L-V", "Miércoles", "14:00", 1400], ["Cuatro", "Sobremesa", "Jueves", "14:45", 3800],
    ["Cuatro", "Tarde", "Viernes", "19:45", 3500], ["Cuatro", "Tarde FS", "Sábado", "19:15", 3500],
    ["Cuatro", "GN domingo", "Domingo", "22:00", 9500]] },
  { canal: "Mediamax", pases: [
    ["Mediamax", "Mediodía", "Lunes", "12:30", 1500], ["Mediamax", "Sobremesa", "Martes", "16:00", 3700],
    ["Mediamax", "Tarde", "Miércoles", "18:00", 3300], ["Mediamax", "Medianoche 1", "Jueves", "00:30", 3000],
    ["Mediamax", "GN viernes", "Viernes", "22:00", 10200], ["Mediamax", "Tarde FS", "Sábado", "15:00", 4800],
    ["Mediamax", "Mediodía FS", "Domingo", "11:30", 2300]] },
];
const mediaset = {
  id: "mediaset",
  logo: "/assets/tv/mediaset.png",
  provider: "Mediaset España",
  format: "Taquilla Mediaset",
  season: "2026/27",
  campaign: "La Estación · Príncipe Pío 2026",
  venue: "Gran Teatro CaixaBank Príncipe Pío",
  status: "Propuesta recibida, pendiente de cerrar",
  target: "Adultos +16",
  duration: "20\"",
  passesProposal: 245,
  rateValue: 746500,
  ratePerWave: 149300,
  plan,
  extras: [
    "Presencia como pieza secundaria en otras campañas de Taquilla Mediaset.",
    "Algún pase extra, según disponibilidad de espacio, en franjas destacadas.",
    "Cobertura editorial en Informativos Telecinco, Noticias Cuatro o un magazine de Telecinco.",
  ],
  pending: [
    "Comida propuesta por Rubén (Mediaset) con los cinco: falta fijar fecha.",
    "Fechas de cada oleada: no vienen en la propuesta.",
    "Cuadrar el número de pases: la propuesta dice 245 y la planificación suma 28 por oleada (140 en 5 oleadas).",
  ],
  contact: { name: "Alejandro Chamizo", role: "Área de Desarrollo de Negocio · Dirección Comercial Editorial", address: "C/ Federico Mompou, 5 bis · 28049 Madrid", phone: "91 396 65 13 (ext. 56513)", mobile: "665 744 725" },
};
// Atresmedia: «Propuesta global Atresmúsica – Musicales Yellow Media» (documento Word recibido en octubre de 2026)
const atresmedia = {
  id: "atresmedia",
  logo: "/assets/tv/atresmedia.png",
  provider: "Atresmedia",
  format: "Atresmúsica + avances promocionales",
  season: "oct 2026 – abr 2027",
  campaign: "Propuesta global Atresmúsica · musicales Yellow Media",
  venue: "We Will Rock You y resto de cartelera",
  status: "Propuesta recibida, pendiente de cerrar",
  target: "Ind+4",
  duration: "30\" (avances) · 1'30\" (pieza editorial)",
  contactsPerWave: "20 MM",
  passesPerWave: "unos 30",
  contactsTotal: "80 MM",
  waves: ["Octubre 2026", "Diciembre 2026", "Febrero 2027", "Abril 2027"],
  editorial: [
    "Microespacio Atresmúsica: programa de 15' en Neox (madrugada), con reemisiones en Mega y Atresplayer.",
    "Pieza editorial de 1'30\" aproximadamente sobre We Will Rock You: producción, reparto, teatro, novedades y fechas.",
    "Noticias de la misma duración con el resto de la cartelera que elijáis en cada momento (Locuras Paralelas, 101 Dálmatas, El Imitador o los teatros).",
  ],
  promo: [
    "Avances de 30\" repartidos por la parrilla, que anuncian los contenidos de Atresmúsica y comparten promoción con otros contenidos musicales y de entretenimiento.",
    "Planificación en target Ind+4, entre Antena 3, laSexta y canales temáticos según disponibilidad.",
  ],
  extras: [
    "Apoyo editorial en Informativos Antena 3 y laSexta y en programas del grupo, sujeto a disponibilidad y criterio de cada productora.",
    "Amplificación digital en las webs del grupo (más de 22 MM de usuarios únicos) con sorteos de entradas u otras acciones, y refuerzo en redes sociales.",
    "Refuerzo HbbTV (formato digital sobre la emisión lineal, con llamada a la acción), segmentado a la Comunidad de Madrid, con el objetivo de 1 MM de impresiones, sin coste añadido.",
  ],
  pending: [
    "Elegir opción: 4 oleadas de un contenido o 2 oleadas de un contenido + 2 con agenda completa.",
    "Fechas exactas de cada oleada (la primera está prevista en octubre de 2026).",
    "Qué contenidos van en las noticias de cada oleada además de We Will Rock You.",
  ],
};
export const TELEVISION = { proposals: [mediaset, atresmedia] };
export const TELEVISION_MONEY: Record<string, any> = {
  mediaset: {
    cost: 30000,
    costNote: "+ IVA · coste fijo, sin mínimo garantizado ni royalty por entrada vendida",
    payment: "Antes del inicio de la comunicación. Se puede fraccionar:",
    split: [
      { amount: 10000, when: "A la firma del contrato, antes de la primera oleada" },
      { amount: 10000, when: "En diciembre" },
      { amount: 10000, when: "Antes de la última oleada" },
    ],
  },
  atresmedia: {
    cost: 50000,
    costNote: "+ IVA · opción 1: 4 oleadas de un contenido (We Will Rock You)",
    payment: "Detalle de la propuesta:",
    split: [
      { amount: 12500, when: "Por oleada (+ IVA), CPM 0,625 €. Atresmedia la valora en 15.000 € según su política comercial" },
      { amount: 70000, when: "Opción 2 (+ IVA): 2 oleadas de un contenido + 2 oleadas con agenda completa" },
      { amount: 22500, when: "Agenda completa por semana (+ IVA), CPM 0,56 €, 2 contenidos a la vez" },
      { amount: 20000, when: "Valor del refuerzo HbbTV según su política comercial: incluido sin coste" },
    ],
  },
};
