const express = require("express");
const session = require("express-session");
const mercadopago = require("mercadopago");
const path = require("path");
const fs = require("fs");

const app = express();

// ================= PORTA (RENDER OK) =================
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

// ================= MERCADO PAGO =================
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

// ================= HOME =================
app.get("/", (req, res) => {
  res.render("index", {
    user: "admin"
  });
});

// ================= ROTA DE ASSINATURA =================
app.get("/assinar", async (req, res) => {
  try {
    const preference = await mercadopago.preferences.create({
      items: [
        {
          title: "Assinatura SaaS Premium",
          quantity: 1,
          currency_id: "BRL",
          unit_price: 19.90
        }
      ],
      back_urls: {
        success: "https://bot-saas-yu2n.onrender.com/sucesso",
        failure: "https://bot-saas-yu2n.onrender.com/erro",
        pending: "https://bot-saas-yu2n.onrender.com/pendente"
      },
      auto_return: "approved"
    });

    res.redirect(preference.body.init_point);
  } catch (err) {
    console.log("Erro assinatura:", err);
    res.send("Erro ao gerar pagamento");
  }
});

// ================= WEBHOOK =================
app.post("/webhook", (req, res) => {
  console.log("🔔 Webhook recebido:", req.body);

  // Aqui você vai ativar usuário depois
  const data = req.body;

  if (data.type === "payment") {
    console.log("💰 Pagamento detectado → ativar assinatura");
  }

  res.sendStatus(200);
});

// ================= ROTAS AUX =================
app.get("/sucesso", (req, res) => {
  res.send("Pagamento aprovado! Assinatura ativa 🚀");
});

app.get("/erro", (req, res) => {
  res.send("Pagamento recusado ❌");
});

app.get("/pendente", (req, res) => {
  res.send("Pagamento pendente ⏳");
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`🚀 SaaS rodando na porta ${PORT}`);
});S