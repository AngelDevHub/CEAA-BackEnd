import { buildReporteDiario, buildReporteSemanal } from "../services/reportesBuilder.js";
import { streamReportePdf } from "../services/reportesPdf.js";

class ReportesPdfController {
  async diario(req, res) {
    try {
      const data = await buildReporteDiario(req);
      await streamReportePdf({ res, data, type: "diario" });
    } catch (error) {
      console.error("Error PDF diario:", error);
      if (res.headersSent) return;
      res.status(500).json({ success: false, message: "Error al generar PDF (diario)" });
    }
  }

  async semanal(req, res) {
    try {
      const data = await buildReporteSemanal(req);
      await streamReportePdf({ res, data, type: "semanal" });
    } catch (error) {
      console.error("Error PDF semanal:", error);
      if (res.headersSent) return;
      res.status(500).json({ success: false, message: "Error al generar PDF (semanal)" });
    }
  }
}

export default new ReportesPdfController();
