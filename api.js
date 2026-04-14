const express = require("express")
const fs = require("fs-extra")
const path = require("path")
const session = require("express-session")
const { MercadoPagoConfig, Preference } = require("mercadopago")

const app = express()

const BASE_PATH = path.join(__dirname, "clients")
const USERS_FILE = path.join(__dirname, "users.json")

fs.ensureDirSync(BASE_PATH)

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(session({
    secret: "saas-secret-key",
    resave: false,
    saveUninitialized: true
}))

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
})

// garante users.json
if (!fs.existsSync(USERS_FILE)) {
    fs.writeJsonSync(USERS_FILE, [
        { user: "admin", pass: "123", paid: false }
    ])
}

// auth
function auth(req, res, next) {
    if (!req.session.user) return res.redirect("/login")
    next()
}

// ---------------- LOGIN ----------------

app.get("/login", (req, res) => {
    res.send(`
        <h2>Login SaaS</h2>
        <form method="POST" action="/login">
            <input name="user" placeholder="usuário" />
            <input name="pass" type="password" placeholder="senha" />
            <button>Entrar</button>
        </form>
    `)
})

app.post("/login", (req, res) => {
    const { user, pass } = req.body

    const users = fs.readJsonSync(USERS_FILE)

    const found = users.find(u => u.user === user && u.pass === pass)

    if (!found) return res.send("❌ Login inválido")

    if (!found.paid) {
        return res.send(`
            <h2>❌ Plano não ativo</h2>
            <a href="/checkout">💰 Assinar agora</a>
        `)
    }

    req.session.user = user
    res.redirect("/")
})

app.get("/logout", (req, res) => {
    req.session.destroy()
    res.redirect("/login")
})

// ---------------- PAINEL ----------------

app.get("/", auth, (req, res) => {

    const userPath = path.join(BASE_PATH, req.session.user)

    const clients = fs.existsSync(userPath)
        ? fs.readdirSync(userPath)
        : []

    res.send(`
        <h1>🚀 SaaS Painel</h1>

        <p>Usuário: ${req.session.user}</p>

        <a href="/logout">Sair</a>

        <h3>➕ Criar cliente</h3>

        <form action="/create-client" method="GET">
            <input name="id" placeholder="cliente" />
            <button>Criar</button>
        </form>

        <h3>📦 Clientes</h3>

        <ul>
            ${clients.length ? clients.map(c => `<li>${c}</li>`).join("") : "<li>Nenhum cliente</li>"}
        </ul>
    `)
})

// ---------------- CRIAR CLIENTE ----------------

app.get("/create-client", auth, async (req, res) => {
    const id = req.query.id

    const userPath = path.join(BASE_PATH, req.session.user)
    const clientPath = path.join(userPath, id)

    await fs.ensureDir(path.join(clientPath, "auth"))

    await fs.writeJson(path.join(clientPath, "respostas.json"), {
        oi: "Bot ativo 🚀"
    })

    res.redirect("/")
})

// ---------------- CHECKOUT ----------------

app.get("/checkout", async (req, res) => {
    try {
        const preference = new Preference(client)

        const result = await preference.create({
            body: {
                items: [
                    {
                        title: "SaaS Bot",
                        quantity: 1,
                        unit_price: 29.90
                    }
                ],
                back_urls: {
                    success: "http://localhost:3000/sucesso",
                    failure: "http://localhost:3000/falha"
                },
                auto_return: "approved"
            }
        })

        res.redirect(result.init_point)

    } catch (err) {
        console.log(err)
        res.send("Erro pagamento")
    }
})

// ---------------- WEBHOOK ----------------

app.post("/webhook", async (req, res) => {
    try {
        console.log("🔔 Webhook recebido:", req.body)

        const users = fs.readJsonSync(USERS_FILE)

        const user = users.find(u => u.paid === false)

        if (user) {
            user.paid = true
            fs.writeJsonSync(USERS_FILE, users)

            console.log("💰 Usuário liberado:", user.user)
        }

        res.sendStatus(200)

    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
})

// ---------------- STATUS ----------------

app.get("/sucesso", (req, res) => {
    res.send("✅ Pagamento aprovado!")
})

app.get("/falha", (req, res) => {
    res.send("❌ Pagamento cancelado")
})

// ---------------- START ----------------

app.listen(3000, () => {
    console.log("🚀 SaaS rodando em http://localhost:3000")
})