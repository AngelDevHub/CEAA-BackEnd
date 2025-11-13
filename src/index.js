import http from "http";
import { Server } from "socket.io";
import chalk from "chalk";
import app from "./app.js";
import { PORT } from "./config.js";
import { db } from "./firebase.js";
import {
  crearModelo,
  entrenarModelo,
  generarPredicciones,
} from "./services/modeloPrediccion.js";

// 🧠 Crear servidor HTTP y modelo IA
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://ceaa-front-end.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"], // 🔹 polling fallback para producción
});

let modelo = crearModelo();
let historial = [];
const sensoresRef = db.ref("sensores");

// 🌱 Calcular índice de crecimiento
function calcularIndiceCrecimiento(temperatura, humedad, nitrogeno) {
  const pesoTemp = 0.4, pesoHum = 0.3, pesoNit = 0.3;
  const tempNorm = Math.min(temperatura / 30, 1);
  const humNorm = Math.min(humedad / 100, 1);
  const nitNorm = Math.min(nitrogeno / 10, 1);
  return parseFloat(((pesoTemp * tempNorm + pesoHum * humNorm + pesoNit * nitNorm) * 100).toFixed(2));
}

// 🧩 Procesar datos y emitir
async function procesarDato(data) {
  try {
    historial.push(data);
    if (historial.length > 30) historial.shift();

    modelo = await entrenarModelo(modelo, historial);
    const predicciones = await generarPredicciones(modelo, data);

    const indiceCrecimiento = calcularIndiceCrecimiento(
      data.temperatura,
      data.humedad,
      data.nitrogeno
    );

    const resultado = { ...data, indiceCrecimiento, fecha: new Date().toISOString() };
    io.emit("nuevosDatos", { actual: resultado, predicciones });
  } catch (error) {
    console.error("Error procesando datos del sensor:", error);
  }
}

// 🔥 Eventos Firebase
["child_added", "child_changed"].forEach(event =>
  sensoresRef.on(event, async snapshot => {
    const data = snapshot.val();
    await procesarDato(data);
  })
);

// 💬 Socket.io
io.on("connection", socket => {
  console.log(chalk.green(`Cliente conectado: ${socket.id}`));

  socket.on("disconnect", reason => {
    console.log(chalk.red(`Cliente desconectado: ${socket.id}, razón: ${reason}`));
  });

  socket.on("error", err => {
    console.error(chalk.red(`Error en socket ${socket.id}:`), err);
  });
});

// 🚀 Iniciar servidor
server.listen(PORT, () => {
  console.log(chalk.blueBright("==========================================="));
  console.log(chalk.greenBright("🚀 Server is running!"));
  console.log(chalk.yellowBright(`📌 Listening on port: ${PORT}`));
  
  if (process.env.NODE_ENV === "development") {
    console.log(chalk.cyanBright(`🌐 http://localhost:${PORT}`));
  } else {
    console.log(chalk.cyanBright("🌐 Server deployed! Use Railway URL for connections"));
  }

  console.log(chalk.blueBright("==========================================="));
});
