import PocketBase from "pocketbase";

const PB_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";
const PB_EMAIL = process.env.POCKETBASE_SUPERUSER_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_SUPERUSER_PASSWORD;

const API_URL = "https://dummyjson.com/carts";
const COLLECTION = "ventas";

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

export async function ensureCollection(pb) {
  const existing = await pb.collections.getFullList();
  if (existing.some((c) => c.name === COLLECTION)) {
    return;
  }
  await pb.collections.create({
    name: COLLECTION,
    type: "base",
    fields: [
      { name: "cart_id", type: "number", required: true },
      { name: "product_rank", type: "number" },
      { name: "product_id", type: "number" },
      { name: "title", type: "text" },
      { name: "price", type: "number" },
      { name: "quantity", type: "number" },
      { name: "total", type: "number" },
      { name: "discount_percentage", type: "number" },
      { name: "discounted_total", type: "number" },
      { name: "thumbnail", type: "text" },
      { name: "cart_total", type: "number" },
      { name: "cart_discounted_total", type: "number" },
      { name: "user_id", type: "number" },
      { name: "total_products", type: "number" },
      { name: "total_quantity", type: "number" },
      { name: "date", type: "date" },
    ],
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });
}

export async function seedSales(pb, carts) {
  const records = [];
  for (const cart of carts) {
    const date = deriveDate(cart.id);
    if (cart.products && cart.products.length > 0) {
      cart.products.forEach((p, i) => {
        records.push({
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
  const total = records.length;
  const col = pb.collection(COLLECTION);
  for (let i = 0; i < total; i++) {
    await col.create(records[i], { requestKey: null });
    if ((i + 1) % 200 === 0 || i + 1 === total) {
      console.log(`  [seed] ${i + 1}/${total} filas`);
    }
  }
  return total;
}

async function main() {
  if (!PB_EMAIL || !PB_PASSWORD) {
    throw new Error("Faltan POCKETBASE_SUPERUSER_EMAIL/PASSWORD en .env.local");
  }
  const pb = new PocketBase(PB_URL);
  await pb
    .collection("_superusers")
    .authWithPassword(PB_EMAIL, PB_PASSWORD);

  console.log("1/3 Fetching todos los carts de DummyJSON...");
  const carts = await fetchAllCarts();
  console.log(`  -> ${carts.length} carts`);

  console.log("2/3 Creando/verificando colección 'ventas'...");
  await ensureCollection(pb);
  console.log("  -> lista");

  console.log("3/3 Insertando registros...");
  const total = await seedSales(pb, carts);
  console.log(`  -> ${total} filas persistidas en la colección 'ventas'.`);
}

main().catch((err) => {
  console.error("ERROR:", err.message ?? err);
  process.exit(1);
});
