import express from "express";
import { SensorController } from "../../controllers/sensorController.js";
import { db } from "../../firebase.js";

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

    // Sobrescribir exactamente el nodo /configuracion
    await db.ref('configuracion').set({
      humedadMinima: Number(humedadMinima),
      tempMaxima: Number(tempMaxima),
      nitrogenoMax: Number(nitrogenoMax),
      tiempoRiegoMin: Number(tiempoRiegoMin),
      tiempoRiegoMax: Number(tiempoRiegoMax),
      intervaloRiegos: Number(intervaloRiegos)
    });

    res.json({ success: true, message: "Configuración de cultivo actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar configuración:", error);
    res.status(500).json({ success: false, message: "Error al actualizar configuración" });
  }
});

export default router;
