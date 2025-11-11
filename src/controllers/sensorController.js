import { SensorModel } from "../models/sensorModel.js";

export const SensorController = {
  // Obtener todos los registros de sensores
  async getSensores(req, res) {
    try {
      const { total, data } = await SensorModel.getAll();
      res.json({
        success: true,
        total_registros: total,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener datos",
      });
    }
  },

  // Agregar un nuevo registro de sensor
  async agregarSensor(req, res) {
    try {
      const { humedad, nitrogeno, temperatura, alerta_nitrogeno } = req.body;

      // Crear el registro con los datos recibidos
      const id = await SensorModel.create({
        humedad,
        nitrogeno,
        temperatura,
        alerta_nitrogeno, // si no viene, SensorModel lo pone como "OK"
      });

      res.json({
        success: true,
        message: "Registro agregado correctamente",
        id,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al agregar sensor",
      });
    }
  },
};
