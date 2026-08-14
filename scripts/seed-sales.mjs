import { createClient } from "@libsql/client";

const DB_URL =
  process.env.TURSO_DATABASE_URL ||
  "libsql://data-ia-mauriciop-dev.aws-us-east-1.turso.io";
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;

const API_URL = "https://dummyjson.com/carts";
const TABLE = "ventas";

if (!DB_TOKEN) {
  throw new Error("Falta TURSO_AUTH_TOKEN en el entorno");
}

const db = createClient({ url: DB_URL, authToken: DB_TOKEN });

function deriveDate(cartId) {
  const day = (cartId % 28) + 1;
  const month = ((Math.floor(cartId / 28) % 12) + 1).toString().padStart(2, "0");
  const year = 2026;
  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

export async function fetchAllCarts() {
  const all = [];
  let skip = 0;
  const limit = 100;
  while (true) {
    const url = `${API_URL}?limit=${limit}&skip=${skip}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
    const data = await res.json();
    all.push(...data.carts);
    if (data.carts.length < limit) break;
    skip += limit;
  }
  return all;
}

export function flattenRows(carts) {
  const rows = [];
  for (const cart of carts) {
    const date = deriveDate(cart.id);
    if (cart.products && cart.products.length > 0) {
      cart.products.forEach((p, i) => {
        rows.push({
          cart_id: cart.id,
          product_rank: i + 1,
          product_id: p.id,
          title: p.title,
          price: p.price,
          quantity: p.quantity,
          total: p.total,
          discount_percentage: p.discountPercentage,
          discounted_total: p.discountedTotal,
          thumbnail: p.thumbnail || "",
          cart_total: cart.total,
          cart_discounted_total: cart.discountedTotal,
          user_id: cart.userId,
          total_products: cart.totalProducts,
          total_quantity: cart.totalQuantity,
          date: date,
        });
      });
    }
  }
  return rows;
}

export async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_rank INTEGER,
      product_id INTEGER,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      total REAL NOT NULL,
      discount_percentage REAL,
      discounted_total REAL,
      thumbnail TEXT,
      cart_total REAL NOT NULL,
      cart_discounted_total REAL NOT NULL,
      user_id INTEGER,
      total_products INTEGER,
      total_quantity INTEGER,
      date TEXT NOT NULL
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_ventas_date ON ventas (date)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_ventas_cart_id ON ventas (cart_id)`);
}

export async function countRows() {
  const res = await db.execute(`SELECT COUNT(*) AS n FROM ${TABLE}`);
  return Number(res.rows[0]?.n ?? 0);
}

export async function seedSales(rows) {
  const total = rows.length;
  const BATCH = 200;
  for (let start = 0; start < total; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    const values = batch.map((r) => [
      r.cart_id,
      r.product_rank,
      r.product_id,
      r.title,
      r.price,
      r.quantity,
      r.total,
      r.discount_percentage,
      r.discounted_total,
      r.thumbnail,
      r.cart_total,
      r.cart_discounted_total,
      r.user_id,
      r.total_products,
      r.total_quantity,
      r.date,
    ]);
    const args = values.flat();
    const placeholders = batch
      .map(
        (_) =>
          `(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .join(",");
    await db.execute({
      sql: `INSERT INTO ${TABLE} (
        cart_id, product_rank, product_id, title, price, quantity, total,
        discount_percentage, discounted_total, thumbnail, cart_total,
        cart_discounted_total, user_id, total_products, total_quantity, date
      ) VALUES ${placeholders}`,
      args,
    });
    const done = Math.min(start + BATCH, total);
    console.log(`  [seed] ${done}/${total} filas`);
  }
  return total;
}

async function main() {
  console.log("1/3 Fetching todos los carts de DummyJSON...");
  const carts = await fetchAllCarts();
  console.log(`  -> ${carts.length} carts`);

  console.log("2/3 Creando/verificando tabla 'ventas'...");
  await ensureTable();
  console.log(`  -> tabla lista (${await countRows()} filas actuales)`);

  console.log("3/3 Insertando registros...");
  const rows = flattenRows(carts);
  const total = await seedSales(rows);
  console.log(`  -> ${total} filas persistidas en Turso (tabla 'ventas').`);
}

main().catch((err) => {
  console.error("ERROR:", err.message ?? err);
  process.exit(1);
});