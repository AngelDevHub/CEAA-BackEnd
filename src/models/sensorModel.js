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
  async create({ humedad, nitrogeno, temperatura, alerta_nitrogeno = "OK", riego = null }) {
    const timestamp = new Date().toISOString(); // Fecha actual en formato ISO
    const newRef = sensorRef.push();
    await newRef.set({
      humedad: humedad.toString(),
      nitrogeno: nitrogeno.toString(),
      temperatura,
      alerta_nitrogeno,
      riego: riego !== null && riego !== undefined ? riego.toString() : undefined,
      timestamp,
    });
    return newRef.key;
  },
};
