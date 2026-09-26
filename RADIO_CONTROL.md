# Radio · Yellow Control

## Alcance

El módulo Radio controla exclusivamente los tres acuerdos vigentes facilitados para Yellow Control:

1. Gran Teatro Pavón · KISS FM.
2. Gran Teatro CaixaBank Príncipe Pío · KISS FM.
3. Gran Teatro CaixaBank Príncipe Pío · Atresmedia Radio (Onda Cero, Europa FM y Melodía FM).

La fuente de inventario está en `site/data/radio-contracts.json`. No se calculan bolsas genéricas ni se mezclan contratos.

## 1. Gran Teatro Pavón · KISS FM

Contrato: M26/9001/0006644.
Periodo: 01/10/2026–30/09/2027.

Inventario lineal KISS FM Madrid, 22", rotación L-D:
- Oct 2026: 124
- Nov 2026: 120
- Dic 2026: 124
- Ene 2027: 124
- Feb 2027: 112
- Mar 2027: 124
- Abr 2027: 120
- May 2027: 124
- Jun 2027: 120
- Jul 2027: 124
- Ago 2027: 124
- Sep 2027: 120
- Total: 1.460 cuñas.

Además se registra como inventario independiente el audio digital IP Madrid comunicado en la renovación: 15.000 impresiones mensuales.

## 2. Príncipe Pío · KISS FM

Contrato: M25/9001/0009482.
Periodo contractual: 31/12/2025–31/12/2026.
Formato: 20", KISS FM Cadena, rotación L-D.

Inventario mensual combinado de KISS-20181 + KISS-20183:
- Ene: 102
- Feb: 92
- Mar: 102
- Abr: 98
- May: 103
- Jun: 98
- Jul: 101
- Ago: 103
- Sep: 98
- Oct: 102
- Nov: 99
- Dic: 101
- Total: 1.199 cuñas.

## 3. Príncipe Pío · Atresmedia Radio

Periodo: 01/02/2026–31/12/2026.
Total: 1.358 inserciones.

Líneas contractuales:
- Onda Cero Madrid · Más de Uno (local) entrada · 5" · 239 inserciones.
- Onda Cero Madrid · Más de Uno (local) salida · 20" · 239.
- Europa FM Madrid · Cuerpos Especiales · 20" · 165.
- Europa FM Madrid · Europa Fórmula 11–17 h · 20" · 165.
- Europa FM Madrid · Fórmula Europa 17–19 h · 20" · 110.
- Melodía FM Majadahonda · Parece Mentira · 20" · 220.
- Melodía FM Majadahonda · Melodía FM Fórmula · 20" · 220.

Los valores mensuales son los del óptico facilitado, no una estimación.

## Modelo de trabajo

Cada registro de Radio puede quedar vinculado a:
- contrato;
- mes de inventario;
- emisora/programa;
- espectáculo;
- semana de emisión;
- número planificado;
- número real/certificado;
- nombre del audio;
- archivo de audio;
- estado del material;
- referencia de certificado;
- observaciones.

### Regla semanal

Una asignación contractual no puede cruzar de semana. Si una campaña se reparte durante varias semanas se crean varios bloques. Esto permite que el agregado semanal y mensual sea exacto y evita prorrateos aproximados.

### Protección de inventario

La interfaz calcula el disponible por contrato + mes + línea y bloquea una asignación que supere la bolsa restante.

### Registros históricos

Los registros anteriores que no tienen `contractId` se conservan como “Sin contrato / histórico”. No se eliminan ni consumen inventario hasta que se reasignen expresamente.

## Informe mensual

El informe mensual muestra:
- contratado;
- asignado;
- disponible;
- real/certificado;
- desglose por emisora/programa;
- consumo por espectáculo.

El botón “Informe mensual” abre una versión imprimible que puede guardarse como PDF desde el navegador.

## Datos reales vs. planificados

“Planificado” es la distribución interna de Yellow Media.
“Real” debe rellenarse a partir del certificado de emisión o dato comprobado del medio. El sistema no presume que lo planificado fue emitido.
