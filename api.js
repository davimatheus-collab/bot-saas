const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();

// ================= CONFIG =================
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "saas_secret",
  resave: false,
  saveUninitialized: false
}));

// ================= VIEW ENGINE =================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ================= ROUTE HOME =================
app.get("/", (req, res) => {
  res.render("index", {
    user: "admin",
    clientes: []
  });
});

// ================= WEBHOOK (Mercado Pago) =================
app.post("/webhook", (req, res) => {
  console.log("🔔 Webhook recebido:", req.body);

  // aqui depois entra lógica de pagamento aprovado
  res.sendStatus(200);
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 SaaS rodando na porta ${PORT}`);
});S