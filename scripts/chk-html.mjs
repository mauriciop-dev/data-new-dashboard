const fs = require("fs");
const t = fs.readFileSync("C:/Users/micnu/AppData/Local/Temp/opencode/page.html", "utf8");
console.log(JSON.stringify({
  len: t.length,
  badge: t.includes("En vivo"),
  asistente: t.includes("Asistente de ventas"),
  title: /<title>(.*?)<\/title>/.exec(t)?.[1] ?? null
}));
