import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const DB_URL =
  process.env.TURSO_DATABASE_URL ||
  "libsql://data-ia-mauriciop-dev.aws-us-east-1.turso.io";
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!DB_TOKEN) {
  throw new Error("Falta TURSO_AUTH_TOKEN en el entorno");
}

const db = createClient({ url: DB_URL, authToken: DB_TOKEN });

function categoryFromThumbnail(thumbnail) {
  if (!thumbnail) return "Otros";
  try {
    const url = new URL(thumbnail);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[1] || "Otros";
  } catch {
    return "Otros";
  }
}

function prettyCategory(raw) {
  const map = {
    beauty: "Belleza",
    fragrances: "Fragancias",
    furniture: "Muebles",
    groceries: "Alimentos",
    "home-decoration": "Deco hogar",
    "kitchen-accessories": "Cocina",
    laptops: "Portátiles",
    "mens-shirts": "Camisas hombre",
    "mens-shoes": "Calzado hombre",
    "mens-watches": "Relojes hombre",
    "mobile-accessories": "Accesorios móvil",
    motorcycle: "Motocicletas",
    "skin-care": "Cuidado piel",
    smartphones: "Smartphones",
    "sports-accessories": "Deportes",
    sunglasses: "Anteojos",
    tablets: "Tablets",
    tops: "Tops",
    vehicle: "Vehículos",
    "womens-bags": "Bolsos mujer",
    "womens-dresses": "Vestidos mujer",
    "womens-jewellery": "Joyas mujer",
    "womens-shoes": "Calzado mujer",
    "womens-watches": "Relojes mujer",
  };
  return map[raw] || raw;
}

async function main() {
  console.log("1/3 Creando tabla 'categorias'...");
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categorias (
      product_id INTEGER PRIMARY KEY,
      categoria TEXT NOT NULL,
      subcategoria TEXT,
      thumbnail TEXT
    )
  `);

  console.log("2/3 Derivando categorías desde 'ventas'...");
  const res = await db.execute(
    `SELECT product_id, title, thumbnail FROM ventas GROUP BY product_id ORDER BY product_id`
  );
  const rows = res.rows;

  const BATCH = 200;
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    const values = [];
    for (const r of batch) {
      const thumb = String(r.thumbnail ?? "");
      const cat = categoryFromThumbnail(thumb);
      values.push(
        Number(r.product_id),
        prettyCategory(cat),
        cat,
        thumb
      );
    }
    const placeholders = batch
      .map(() => `(?,?,?,?)`)
      .join(",");
    await db.execute({
      sql: `INSERT INTO categorias (product_id, categoria, subcategoria, thumbnail) VALUES ${placeholders}
            ON CONFLICT(product_id) DO UPDATE SET
              categoria=excluded.categoria,
              subcategoria=excluded.subcategoria,
              thumbnail=excluded.thumbnail`,
      args: values,
    });
  }
  console.log(`  -> ${rows.length} productos categorizados`);

  console.log("3/3 Verificando...");
  const check = await db.execute(`SELECT categoria, COUNT(*) n FROM categorias GROUP BY categoria ORDER BY n DESC`);
  for (const r of check.rows) {
    console.log(`  ${r.categoria}: ${r.n}`);
  }
}

main().catch((err) => {
  console.error("ERROR:", err.message ?? err);
  process.exit(1);
});
