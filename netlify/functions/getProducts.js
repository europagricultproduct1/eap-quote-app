/**
 * Netlify Function: getProducts
 * Devuelve [{ id, name, priceKg, porteKg }] leyendo tu DB de Notion.
 * Vars de entorno necesarias:
 *   NOTION_API_KEY
 *   NOTION_DATABASE_ID
 */
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_DATABASE_ID;

// "4,33 €" -> 4.33
function parseEuro(str) {
  if (str === null || str === undefined) return null;
  if (typeof str === "number") return str;
  const s = String(str).trim()
    .replace(/\./g, "")
    .replace(/€|\s/g, "")
    .replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// obtiene texto de Title/RichText
function getText(prop) {
  if (!prop) return "";
  const arr = prop.rich_text || prop.title || [];
  return arr.map(x => x.plain_text).join("");
}

// localiza propiedad por nombre (tolerante)
function findProp(props, candidates) {
  for (const key of Object.keys(props)) {
    const lower = key.toLowerCase();
    for (const cand of candidates) {
      if (lower.includes(cand)) return props[key];
    }
  }
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: ""
    }
  }

  try {
    let results = [];
    let cursor;

    do {
      const resp = await notion.databases.query({
        database_id: DB_ID,
        start_cursor: cursor
      });
      results = results.concat(resp.results);
      cursor = resp.has_more ? resp.next_cursor : undefined;
    } while (cursor);

    const items = results.map(page => {
      const props = page.properties;
      const productoProp = findProp(props, ["producto"]);
      const precioFinalProp = findProp(props, ["precio final por kg", "precio final kg", "final por kg"]);
      const porteProp = findProp(props, ["porte", "precio porte"]);

      const name = getText(productoProp);
      const priceKg = parseEuro(precioFinalProp?.number ?? getText(precioFinalProp));
      const porteKg = parseEuro(porteProp?.number ?? getText(porteProp));

      return { id: page.id, name, priceKg, porteKg, raw: undefined };
    }).filter(x => x.name);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true, items })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
