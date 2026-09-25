# PAVÓN CONTROL

Aplicación interna del Gran Teatro Pavón para controlar cartelería, calendario, radio, publicidad/acuerdos, intercambiadores, histórico, avisos y usuarios.

## Producción

- Web: https://cartelera-pavon.netlify.app/
- Código: GitHub `feryellow/cartelera.pavon`
- Hosting/Functions/Blobs: Netlify
- La cartelería histórica se conserva en `pavon-carteleria`.
- Los nuevos módulos usan `pavon-control`, `pavon-assets` y `pavon-notifications`.

## Estructura

- `site/index.html`: shell de Pavón Control.
- `site/app.js`: dashboard, Radio, Publicidad, Intercambiadores, Calendario, Histórico y Usuarios.
- `site/carteleria.html`: editor visual de cartelería existente, conservado y conectado al nuevo backend.
- `site/control.css`: interfaz responsive.
- `site/sw.js`: PWA; no cachea endpoints `/api/`.
- `site/manifest.webmanifest`: instalación como app.
- `site/bundle/part-*.txt`: plantilla original de cartelería, conservada para no destruir el trabajo existente.

## Datos

### Cartelería
Netlify Blobs `pavon-carteleria`.
Las imágenes nuevas se almacenan como bytes binarios. Las imágenes antiguas en formato data URL se siguen leyendo y se migran de forma natural al siguiente guardado.

### Radio / Publicidad / Intercambiadores
Registros JSON en `pavon-control`.
Archivos de audio, imagen y PDF en `pavon-assets`.

### Histórico
Cada acción relevante genera entradas `audit_*` en `pavon-control`.

## Seguridad

La edición pública antigua ha sido eliminada del código. Los endpoints de escritura validan permisos en servidor.

Roles previstos:
- `admin`: acceso completo.
- `gestion`: Cartelería, Radio, Publicidad, Intercambiadores, Calendario e históricos.
- `carteleria`: Cartelería + Calendario relacionado + histórico correspondiente.
- `consulta`: solo lectura de módulos autorizados.

### Activación requerida: Netlify Identity
El código usa `@netlify/identity`, pero Netlify Identity debe habilitarse en el proyecto desde Netlify antes de poder crear los usuarios reales.

Después de habilitar Identity:
1. Crear el primer usuario administrador.
2. Asignarle el rol `admin`.
3. Desde Pavón Control → Usuarios, crear/invitar el resto y asignar roles.

Existe compatibilidad temporal con `PAVON_EDIT_KEY` para administración de emergencia, pero no debe sustituir a Identity.

## Email

El guardado de cartelería se completa antes de intentar el correo. Si el correo falla o no está configurado, el guardado no se pierde y queda un registro pendiente.

Variables necesarias:
- `RESEND_API_KEY`
- `PAVON_EMAIL_FROM`
- `PAVON_EMAIL_TO`
- `PAVON_EMAIL_CC` (opcional)

Los avisos D-7, D-3 y D-1 se ejecutan mediante una Scheduled Function diaria (`0 7 * * *`, UTC).

## Calendario

`/api/calendar-data` reúne automáticamente:
- instalación/cambio de Cartelería;
- inicio/fin de Radio;
- inicio/fin de Publicidad;
- inicio/fin de Intercambiadores.

No se duplica la introducción de fechas.

## OneBox

Pendiente de credenciales/API reales. No hay endpoints ni claves inventados. La aplicación funciona sin OneBox.

## Desarrollo

```bash
npm install
npm run dev
```

No guardar secretos en GitHub.
