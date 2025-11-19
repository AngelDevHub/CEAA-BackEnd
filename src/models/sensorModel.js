import { db } from "../firebase.js";

const sensorRef = db.ref("sensores");

export const SensorModel = {
  async getAll() {
    const snapshot = await sensorRef.once("value");
    const data = snapshot.val();
    const total = data ? Object.keys(data).length : 0;

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
    const timestamp = new Date().toISOString();
    const newRef = sensorRef.push();
    await newRef.set({
      humedad: humedad.toString(),      
      nitrogeno: nitrogeno.toString(),   
      temperatura,                      
      alerta_nitrogeno,
      timestamp,
    });
    return newRef.key;
  },
};
