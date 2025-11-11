import express from "express";
import { SensorController } from "../../controllers/sensorController.js";

const router = express.Router();

router.get("/sensores", SensorController.getSensores);
router.post("/actualizar", SensorController.agregarSensor);

export default router;
