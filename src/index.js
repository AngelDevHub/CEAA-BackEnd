import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { PORT } from "./config.js";
import { db } from "./firebase.js";
import {
  crearModelo,
  entrenarModelo,
  generarPredicciones,
  calcularIndiceCrecimiento,
} from "./services/modeloPrediccion.js";

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
  transports: ["polling", "websocket"],
});

let modelo = crearModelo();
let historial = [];
const sensoresRef = db.ref("sensores");



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
  }
}

["child_added", "child_changed"].forEach(event =>
  sensoresRef.on(event, async snapshot => {
    const data = snapshot.val();
    await procesarDato(data);
  })
);

io.on("connection", socket => {
  socket.on("disconnect", reason => {
  });
  socket.on("error", err => {
  });
});

server.listen(PORT, () => {
});
