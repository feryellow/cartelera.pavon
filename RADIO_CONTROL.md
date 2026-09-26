# Radio · Yellow Control

## Alcance

El módulo Radio controla exclusivamente los tres acuerdos facilitados para Yellow Control:

1. Gran Teatro Pavón · KISS FM.
2. Gran Teatro CaixaBank Príncipe Pío · KISS FM.
3. Gran Teatro CaixaBank Príncipe Pío · Atresmedia Radio (Onda Cero, Europa FM y Melodía FM).

La fuente de inventario está en `site/data/radio-contracts.json`. No se mezclan contratos ni se generan bolsas genéricas.

## Gran Teatro Pavón · KISS FM

Contrato M26/9001/0006644. Periodo 01/10/2026–30/09/2027.

KISS FM Madrid, 22", rotación L-D:
- Oct 2026 124
- Nov 2026 120
- Dic 2026 124
- Ene 2027 124
- Feb 2027 112
- Mar 2027 124
- Abr 2027 120
- May 2027 124
- Jun 2027 120
- Jul 2027 124
- Ago 2027 124
- Sep 2027 120
- Total 1.460 cuñas.

Audio digital IP Madrid: 15.000 impresiones mensuales, registradas como inventario independiente.

## Príncipe Pío · KISS FM

Contrato M25/9001/0009482. Periodo 31/12/2025–31/12/2026. Cuña 20", KISS FM Cadena, rotación L-D.

Inventario mensual combinado de KISS-20181 y KISS-20183:
- Ene 102
- Feb 92
- Mar 102
- Abr 98
- May 103
- Jun 98
- Jul 101
- Ago 103
- Sep 98
- Oct 102
- Nov 99
- Dic 101
- Total 1.199 cuñas.

## Príncipe Pío · Atresmedia Radio

Periodo 01/02/2026–31/12/2026. Total 1.358 inserciones.

Líneas:
- Onda Cero Madrid · Más de Uno local entrada · 5" · 239.
- Onda Cero Madrid · Más de Uno local salida · 20" · 239.
- Europa FM Madrid · Cuerpos Especiales · 20" · 165.
- Europa FM Madrid · Europa Fórmula 11–17 h · 20" · 165.
- Europa FM Madrid · Fórmula Europa 17–19 h · 20" · 110.
- Melodía FM Majadahonda · Parece Mentira · 20" · 220.
- Melodía FM Majadahonda · Melodía FM Fórmula · 20" · 220.

Los inventarios mensuales son los del óptico recibido.

## Modelo de registro

Cada asignación puede vincular:
- contrato;
- mes;
- emisora/programa;
- espectáculo;
- fechas de la semana;
- cantidad planificada;
- cantidad real/certificada;
- nombre de la pieza;
- audio;
- estado del material;
- referencia del certificado;
- observaciones.

Una asignación contractual debe quedar dentro de una misma semana (lunes a domingo). Si una campaña cruza de semana o de mes se divide en varios bloques. Esto evita prorrateos aproximados y mantiene exactos los informes semanales y mensuales.

## Protección de inventario

Yellow Control calcula el disponible por contrato + mes + línea y bloquea una nueva asignación que supere la bolsa restante.

Los registros anteriores sin `contractId` se conservan como históricos y no consumen inventario hasta que se vinculen expresamente.

## Informe mensual

El informe muestra:
- contratado;
- asignado;
- disponible;
- real/certificado;
- desglose por emisora/programa;
- consumo por espectáculo.

El informe es imprimible y se puede guardar como PDF desde el navegador.

## Criterio de datos

“Planificado” = reparto interno registrado en Yellow Control.

“Real” = emisión o consumo confirmado por certificado o dato comprobado del medio.

El sistema no da por emitido automáticamente lo planificado.
