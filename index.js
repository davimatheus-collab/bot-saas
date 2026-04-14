const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys")
const QRCode = require("qrcode")
const fs = require("fs")

const CLIENTS_DIR = "./clients"

// STATUS GLOBAL (compartilha com API)
const clientStatus = {}
global.clientStatus = clientStatus

function getClients() {
    if (!fs.existsSync(CLIENTS_DIR)) return []
    return fs.readdirSync(CLIENTS_DIR)
}

async function startClient(clientId) {
    try {
        const clientPath = `${CLIENTS_DIR}/${clientId}`

        if (!fs.existsSync(clientPath)) return

        const respostasPath = `${clientPath}/respostas.json`

        const respostas = fs.existsSync(respostasPath)
            ? require(respostasPath)
            : {}

        const { state, saveCreds } = await useMultiFileAuthState(`${clientPath}/auth`)
        const { version } = await fetchLatestBaileysVersion()

        const sock = makeWASocket({
            version,
            auth: state,
            browser: ["SaaS Bot", "Chrome", "1.0"]
        })

        clientStatus[clientId] = "CONECTANDO"

        sock.ev.on("creds.update", saveCreds)

        sock.ev.on("connection.update", (update) => {
            const { connection, qr } = update

            // QR CODE (para painel)
            if (qr) {
                QRCode.toDataURL(qr, (err, url) => {
                    if (!err) {
                        clientStatus[clientId] = {
                            status: "QR",
                            qr: url
                        }
                    }
                })
            }

            if (connection === "open") {
                console.log(`✅ ONLINE: ${clientId}`)
                clientStatus[clientId] = "ONLINE"
            }

            if (connection === "close") {
                console.log(`❌ OFFLINE: ${clientId}`)
                clientStatus[clientId] = "OFFLINE"

                setTimeout(() => startClient(clientId), 5000)
            }
        })

        sock.ev.on("messages.upsert", async ({ messages }) => {
            const msg = messages[0]
            if (!msg.message) return

            const texto =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                ""

            const resposta = respostas[texto.toLowerCase()]

            if (resposta) {
                await sock.sendMessage(msg.key.remoteJid, { text: resposta })
            }
        })

    } catch (err) {
        console.log(`Erro ${clientId}:`, err.message)
        clientStatus[clientId] = "OFFLINE"
    }
}

function startAllClients() {
    if (!fs.existsSync(CLIENTS_DIR)) {
        fs.mkdirSync(CLIENTS_DIR)
    }

    const clients = getClients()

    console.log("🚀 Clientes:", clients)

    clients.forEach(clientId => startClient(clientId))
}

startAllClients()