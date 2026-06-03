import { buildReporteDiario, buildReporteSemanal } from "../services/reportesBuilder.js";

class ReportesController {
  async diario(req, res) {
    try {
      return res.json({
        success: true,
        data: await buildReporteDiario(req)
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al generar reporte diario" });
    }
  }

  async semanal(req, res) {
    try {
      return res.json({
        success: true,
        data: await buildReporteSemanal(req)
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al generar reporte semanal" });
    }
  }
}

export default new ReportesController();
