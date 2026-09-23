# Cartelería Gran Teatro Pavón

Panel interactivo para controlar la cartelería de fachada del Gran Teatro Pavón.

## Arquitectura

- **GitHub:** código fuente y control de versiones.
- **Netlify:** publicación web, Functions y Netlify Blobs.
- **Netlify Blobs:** guarda el estado actual, próximos cambios y las imágenes de los carteles.

El repositorio es la fuente del código. Los datos que cambian día a día (carteles y calendario) **no se guardan en GitHub**: se guardan en Netlify Blobs.

## Netlify

1. Importa este repositorio en Netlify.
2. Netlify detectará `netlify.toml`; no necesitas build command.
3. En **Project configuration → Environment variables**, crea:
   - `PAVON_EDIT_KEY` = una clave de edición que solo conozca el equipo.
4. Publica el sitio.

## Uso

- El panel carga automáticamente la última versión guardada en Netlify.
- Para **Guardar cambios**, solicita `PAVON_EDIT_KEY`.
- **Recargar nube** recupera la última versión publicada.
- Las imágenes se reducen en el navegador antes de subirse.
