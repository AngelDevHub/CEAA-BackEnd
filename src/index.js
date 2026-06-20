import http from "http";
import { Server } from "socket.io";
import chalk from "chalk";
import app from "./app.js";
import { PORT } from "./config.js";
import { db } from "./firebase.js";
import ConfigModel from "./models/config.model.js";
import TareasModel from "./models/tareas.model.js";
import UsuariosModel from "./models/usuarios.model.js";
import ActividadModel from "./models/actividad.model.js";
import {
  crearModelo,
  entrenarModelo,
  generarPredicciones,
  calcularIndiceCrecimiento,
} from "./services/modeloPrediccion.js";

const isDev = process.env.NODE_ENV === "development";
const debugLog = (...args) => {
  if (isDev) console.log(...args);
};

// 🧠 Crear servidor HTTP y modelo IA
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const ok =
        origin === "http://localhost:5173" ||
        origin === "https://ceaa-front-end.vercel.app" ||
        (typeof origin === "string" && origin.startsWith("https://ceaa-front-end") && origin.endsWith(".vercel.app"));
      return ok ? callback(null, true) : callback(new Error("No permitido por CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"], // 🔹 polling fallback para producción
});

let modelo = crearModelo();
let historial = [];
const sensoresRef = db.ref("sensores");

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function resolveDefaultUsers() {
  const owner = await UsuariosModel.findFirstByRole("owner");
  const worker = await UsuariosModel.findFirstByRole("worker");
  return { owner, worker };
}

async function getHumidityThreshold() {
  const t = await ConfigModel.get("alertas.thresholds");
  const v = t?.value && typeof t.value === "object" ? t.value : {};
  const h = Number(v.humedad_min_riego);
  return Number.isFinite(h) ? h : 45;
}

async function maybeCreatePreventiveIrrigationTask({ actual, predicciones }) {
  if (!Array.isArray(predicciones) || predicciones.length === 0) return;

  const humidityThreshold = await getHumidityThreshold();
  const hit = predicciones.find((p) => Number(p?.humidity) < humidityThreshold);
  if (!hit) return;

  const ts = actual?.timestamp || actual?.fecha;
  const d = ts ? new Date(ts) : null;
  if (d && !Number.isNaN(d.getTime())) {
    if (Date.now() - d.getTime() > 10 * 60 * 1000) return;
  }

  const { owner, worker } = await resolveDefaultUsers();
  const asignado = worker?.id_usuario || owner?.id_usuario;
  const creadoPor = owner?.id_usuario || asignado;
  if (!asignado || !creadoPor) return;

  const titlePrefix = "Riego preventivo (predicción 4h)";
  const existing = await TareasModel.findRecentOpenByTitlePrefix({
    asignado_a: asignado,
    titlePrefix,
    minutes: 120
  });
  if (existing) return;

  const predictedHumidity = Number(hit.humidity);
  const actualHumidity = toNumber(actual?.humedad);
  const margin = Number.isFinite(actualHumidity) ? actualHumidity - humidityThreshold : null;
  const prioridad = predictedHumidity < humidityThreshold - 3 || (margin !== null && margin <= 2) ? "alta" : "media";

  const descripcion = `La predicción indica que la humedad bajará a ~${predictedHumidity.toFixed(1)}% (< ${humidityThreshold}%) alrededor de ${hit.time}. Revisar goteo/bomba y preparar riego preventivo.`;

  const idTarea = await TareasModel.create({
    titulo: titlePrefix,
    descripcion,
    prioridad,
    asignado_a: asignado,
    creado_por: creadoPor
  });

  await ActividadModel.create({
    id_usuario: creadoPor,
    accion: "auto.task.created",
    detalle: {
      id_tarea: idTarea,
      tipo: "riego_preventivo",
      humedad_umbral: humidityThreshold,
      humedad_actual: actualHumidity,
      humedad_predicha: predictedHumidity,
      hora_predicha: hit.time
    }
  });
}


// 🧩 Procesar datos y emitir
async function procesarDato(data) {
  try {
    const normalized = {
      ...data,
      temperatura: toNumber(data?.temperatura) ?? data?.temperatura,
      humedad: toNumber(data?.humedad) ?? data?.humedad,
      nitrogeno: toNumber(data?.nitrogeno) ?? data?.nitrogeno
    };

    historial.push(normalized);
    if (historial.length > 30) historial.shift();

    modelo = await entrenarModelo(modelo, historial);
    const predicciones = await generarPredicciones(modelo, normalized);

    const indiceCrecimiento = calcularIndiceCrecimiento(
      normalized.temperatura,
      normalized.humedad,
      normalized.nitrogeno
    );

    const resultado = { ...normalized, indiceCrecimiento, fecha: new Date().toISOString() };
    io.emit("nuevosDatos", { actual: resultado, predicciones });

    await maybeCreatePreventiveIrrigationTask({ actual: resultado, predicciones });
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
  debugLog(chalk.green(`Cliente conectado: ${socket.id}`));

  socket.on("disconnect", reason => {
    debugLog(chalk.red(`Cliente desconectado: ${socket.id}, razón: ${reason}`));
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
