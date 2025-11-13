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
    origin: ["http://localhost:5173",
            "https://ceaa-front-end.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let modelo = crearModelo();
let historial = [];
const sensoresRef = db.ref("sensores");

// 🌱 Función para calcular el índice de crecimiento de rábanos
function calcularIndiceCrecimiento(temperatura, humedad, nitrogeno) {
  // Fórmula base simple — puedes ajustarla con tus datos reales
  const pesoTemp = 0.4;
  const pesoHum = 0.3;
  const pesoNit = 0.3;

  // Escalamos los valores para que el índice esté entre 0 y 1
  const tempNorm = Math.min(temperatura / 30, 1);
  const humNorm = Math.min(humedad / 100, 1);
  const nitNorm = Math.min(nitrogeno / 10, 1);

  const indice = pesoTemp * tempNorm + pesoHum * humNorm + pesoNit * nitNorm;
  return parseFloat((indice * 100).toFixed(2)); // porcentaje de crecimiento
}

// 🧩 Función principal para procesar datos de sensores
async function procesarDato(data) {
  try {
    
    historial.push(data);
    if (historial.length > 30) historial.shift();

    // Entrenar modelo con historial reciente
    modelo = await entrenarModelo(modelo, historial);

    // Generar predicciones futuras
    const predicciones = await generarPredicciones(modelo, data);

    // Calcular índice de crecimiento del cultivo
    const indiceCrecimiento = calcularIndiceCrecimiento(
      data.temperatura,
      data.humedad,
      data.nitrogeno
    );

    // Crear objeto completo
    const resultado = {
      ...data,
      indiceCrecimiento,
      fecha: new Date().toISOString(),
    };

    // Emitir datos al front
    io.emit("nuevosDatos", {
      actual: resultado,
      predicciones,
    });

  } catch (error) {
    
  }
}

// 🔥 Eventos Firebase
sensoresRef.on("child_added", async (snapshot) => {
  const data = snapshot.val();
  await procesarDato(data);
});

sensoresRef.on("child_changed", async (snapshot) => {
  const data = snapshot.val();
  await procesarDato(data);
});

// 💬 Socket.io
io.on("connection", (socket) => {
  console.log(chalk.green(`Cliente conectado: ${socket.id}`));

  socket.on("disconnect", () => {
    console.log(chalk.red(`Cliente desconectado: ${socket.id}`));
  });
});

// 🚀 Iniciar servidor
server.listen(PORT, () => {
  console.log(chalk.blueBright("==========================================="));
  console.log(chalk.greenBright("🚀  Server is running!"));
  console.log(chalk.yellowBright(`📌  Listening on port: ${PORT}`));
  console.log(chalk.cyanBright(`🌐  http://localhost:${PORT}`));
  console.log(chalk.blueBright("==========================================="));
});
