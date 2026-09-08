import express from "express";
import { SensorController } from "../../controllers/sensorController.js";
import { db } from "../../firebase.js";
import ConfigModel from "../../models/config.model.js";

const router = express.Router();

router.get("/sensores", SensorController.getSensores);
router.post("/actualizar", SensorController.agregarSensor);

// Nuevo endpoint para actualizar la configuración de cultivo
router.put('/configuracion', async (req, res) => {
  try {
    const { 
      humedadMinima, 
      tempMaxima, 
      nitrogenoMax, 
      tiempoRiegoMin, 
      tiempoRiegoMax, 
      intervaloRiegos 
    } = req.body;

    // Validación básica
    if (humedadMinima === undefined) {
      return res.status(400).json({ success: false, message: "Faltan datos de configuración" });
    }

    // 1. Sobrescribir exactamente el nodo /configuracion en Firebase RTDB
    await db.ref('configuracion').set({
      humedadMinima: Number(humedadMinima),
      tempMaxima: Number(tempMaxima),
      nitrogenoMax: Number(nitrogenoMax),
      tiempoRiegoMin: Number(tiempoRiegoMin),
      tiempoRiegoMax: Number(tiempoRiegoMax),
      intervaloRiegos: Number(intervaloRiegos)
    });

    // 2. Sincronizar MySQL para alertas y reportes históricos del backend
    try {
      await ConfigModel.upsert({
        key: 'alertas.thresholds',
        value: {
          humedad_min_riego: Number(humedadMinima),
          nitrogeno_min: 0,
          temperatura_min: 0,
          temperatura_max: Number(tempMaxima)
        }
      });
    } catch (sqlErr) {
      console.warn("Sincronización MySQL omitida:", sqlErr.message);
    }

    res.json({ success: true, message: "Configuración de cultivo actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar configuración:", error);
    res.status(500).json({ success: false, message: "Error al actualizar configuración" });
  }
});

export default router;

