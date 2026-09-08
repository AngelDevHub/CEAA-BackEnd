import express from "express";
import { SensorController } from "../../controllers/sensorController.js";
import { db } from "../../firebase.js";
import ConfigModel from "../../models/config.model.js";
import { validateToken, checkPermission, checkAnyPermission } from "../../middlewares/validateToken.js";

const router = express.Router();

// BUG-002 FIX: Sensores ahora requieren autenticación
// (El ESP32 NO usa estos endpoints — habla directo con Firebase RTDB)
router.get("/sensores", validateToken, checkAnyPermission(['view:field', 'manage:users']), SensorController.getSensores);
router.post("/actualizar", validateToken, checkPermission('manage:users'), SensorController.agregarSensor);

// BUG-001 FIX: Configuración de cultivo ahora requiere autenticación + permiso manage:users
router.put('/configuracion', validateToken, checkPermission('manage:users'), async (req, res) => {
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

    // Validación de rangos razonables
    const hm = Number(humedadMinima);
    const tm = Number(tempMaxima);
    const nm = Number(nitrogenoMax);
    if (!Number.isFinite(hm) || hm < 0 || hm > 100) {
      return res.status(400).json({ success: false, message: "humedadMinima debe ser un número entre 0 y 100" });
    }
    if (!Number.isFinite(tm) || tm < -10 || tm > 60) {
      return res.status(400).json({ success: false, message: "tempMaxima debe ser un número entre -10 y 60" });
    }
    if (!Number.isFinite(nm) || nm < 0 || nm > 500) {
      return res.status(400).json({ success: false, message: "nitrogenoMax debe ser un número entre 0 y 500" });
    }

    // 1. Sobrescribir exactamente el nodo /configuracion en Firebase RTDB
    await db.ref('configuracion').set({
      humedadMinima: hm,
      tempMaxima: tm,
      nitrogenoMax: nm,
      tiempoRiegoMin: Number(tiempoRiegoMin),
      tiempoRiegoMax: Number(tiempoRiegoMax),
      intervaloRiegos: Number(intervaloRiegos)
    });

    // 2. Sincronizar MySQL para alertas y reportes históricos del backend
    try {
      await ConfigModel.upsert({
        key: 'alertas.thresholds',
        value: {
          humedad_min_riego: hm,
          nitrogeno_min: 0,
          temperatura_min: 0,
          temperatura_max: tm
        },
        updated_by: req.user.id_usuario
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

// Endpoint para leer la configuración actual desde Firebase
router.get('/configuracion', validateToken, checkAnyPermission(['view:field', 'manage:users']), async (req, res) => {
  try {
    const snapshot = await db.ref('configuracion').once('value');
    const data = snapshot.val();
    res.json({ success: true, data: data || null });
  } catch (error) {
    console.error("Error al leer configuración:", error);
    res.status(500).json({ success: false, message: "Error al leer configuración" });
  }
});

export default router;

