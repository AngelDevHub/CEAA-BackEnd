import { db } from "../firebase.js";

const sensorRef = db.ref("sensores");

export const SensorModel = {
  // Obtener todos los registros
  async getAll() {
    const snapshot = await sensorRef.once("value");
    const data = snapshot.val();
    const total = data ? Object.keys(data).length : 0;

    // Convertimos los datos en un array con id incluido
    const formattedData = data
      ? Object.entries(data).map(([id, item]) => ({
          id,
          ...item,
        }))
      : [];

    return { total, data: formattedData };
  },

  // Crear un nuevo registro
  async create({ humedad, nitrogeno, temperatura, alerta_nitrogeno = "OK" }) {
    const timestamp = new Date().toISOString(); // Fecha actual en formato ISO
    const newRef = sensorRef.push();
    await newRef.set({
      humedad: humedad.toString(),       // aseguramos que sea string
      nitrogeno: nitrogeno.toString(),   // aseguramos que sea string
      temperatura,                       // puede quedar como number
      alerta_nitrogeno,
      timestamp,
    });
    return newRef.key;
  },
};
