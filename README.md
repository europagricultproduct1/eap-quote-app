# EAP · Cotizador Mayorista (Notion → Netlify)

App estática (HTML+JS) desplegable en Netlify que **lee precios desde una base de Notion** y permite:
- buscar productos,
- añadir cantidades en kg,
- calcular importes,
- sumar un porte opcional,
- **exportar a PDF** con branding.

## Estructura
```
eap-quote-app/
  netlify.toml
  package.json
  /public
    index.html
    styles.css
    app.js
    logo-eap.png  (opcional, añade tu logo aquí)
  /netlify/functions
    getProducts.js
```

## Variables de entorno en Netlify
Crea dos Environment Variables en tu sitio de Netlify:
- `NOTION_API_KEY` → token secreto (integration token) con acceso a tu DB.
- `NOTION_DATABASE_ID` → ID de la base que contiene las columnas:
  - **Producto**
  - **Precio final por kg (sin porte)**
  - (opcional) **Precio porte hasta almacén Llíria**

> Comparte la DB con tu integración desde Notion: `... ••• > Connections > Share > Invite` y selecciona tu integration.

## Deploy rápido
1. Sube esta carpeta a un repo (GitHub/GitLab).
2. **Netlify > New site from Git**.
3. Define las variables de entorno arriba.
4. Deploy. (Netlify instalará `@notionhq/client` automáticamente).

## Uso
- Abre la app, escribe el nombre del producto, selecciona, define kg y **Añadir**.
- Ajusta el **Porte** si corresponde.
- **Exportar PDF** para generar el presupuesto.

## Notas
- Los precios se interpretan de la columna “Precio final por kg (sin porte)”.
- Si tus precios tienen formato “4,33 €”, el backend los normaliza a número.
- Para IVA por tramos o extra de lógica, extiende `app.js` y la tabla del PDF.
