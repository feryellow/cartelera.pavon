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
export const TELEVISION = {
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
export const TELEVISION_MONEY = {
  cost: 30000,
  costNote: "+ IVA · coste fijo, sin mínimo garantizado ni royalty por entrada vendida",
  payment: "Antes del inicio de la comunicación. Se puede fraccionar:",
  split: [
    { amount: 10000, when: "A la firma del contrato, antes de la primera oleada" },
    { amount: 10000, when: "En diciembre" },
    { amount: 10000, when: "Antes de la última oleada" },
  ],
};
