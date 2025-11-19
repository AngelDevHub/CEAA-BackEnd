import { SensorModel } from "../models/sensorModel.js";

export const SensorController = {
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

  async agregarSensor(req, res) {
    try {
      const { humedad, nitrogeno, temperatura, alerta_nitrogeno } = req.body;

      const id = await SensorModel.create({
        humedad,
        nitrogeno,
        temperatura,
        alerta_nitrogeno,
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
