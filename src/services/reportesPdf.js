import PDFDocument from "pdfkit";

function sanitizePdfText(value) {
  if (value === null || value === undefined) return "-";
  const s = String(value);
  if (!s.length) return "-";
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0);
    out += code !== undefined && code <= 255 ? ch : "?";
  }
  return out;
}

function safeText(value) {
  return sanitizePdfText(value);
}

function fmtNumber(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(digits);
}

function fmtHours(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return "0.0 h";
  return `${(n / 3600).toFixed(1)} h`;
}

function fmtDate(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return sanitizePdfText(d.toLocaleString());
  } catch {
    return "-";
  }
}

function ensurePageSpace(doc, y, needed, opts) {
  const bottom = doc.page.height - opts.marginBottom;
  if (y + needed <= bottom) return y;
  doc.addPage();
  return opts.marginTop;
}

function drawHeader(doc, data, meta) {
  const { title, subtitle, generatedAt } = meta;
  const x = doc.page.margins.left;
  let y = doc.page.margins.top;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.rect(x, y, width, 64).fill("#0b1220");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18).text("CEAA", x + 14, y + 14);
  doc.font("Helvetica").fontSize(9).fillColor("#cbd5e1").text("Control y administración de invernaderos", x + 14, y + 38);

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12).text(title, x, y + 16, { width, align: "right" });
  doc.font("Helvetica").fontSize(9).fillColor("#cbd5e1").text(subtitle, x, y + 34, { width, align: "right" });
  doc.font("Helvetica").fontSize(8).fillColor("#cbd5e1").text(`Generado: ${fmtDate(generatedAt)}`, x, y + 48, { width, align: "right" });

  y += 80;
  doc.fillColor("#0b1220").font("Helvetica-Bold").fontSize(11).text("Resumen ejecutivo", x, y);
  y += 10;
  doc.moveTo(x, y).lineTo(x + width, y).lineWidth(1).strokeColor("#e5e7eb").stroke();
  y += 14;

  const boxes = [
    { label: "Riesgo 4h", value: safeText(data?.sensores?.riesgo_4h) },
    { label: "Estrés hídrico", value: fmtHours(data?.sensores?.seconds_under_humidity_threshold || 0) },
    { label: "Agua estimada", value: `${fmtNumber(data?.operacion?.riegos?.litros_estimados, 3)} L` },
    { label: "Operación", value: `${data?.operacion?.tareas_creadas ?? 0} tareas - ${data?.operacion?.bitacoras ?? 0} bitácoras` }
  ];

  const gap = 10;
  const boxW = (width - gap * 3) / 4;
  const boxH = 54;
  boxes.forEach((b, idx) => {
    const bx = x + idx * (boxW + gap);
    doc.roundedRect(bx, y, boxW, boxH, 8).strokeColor("#e5e7eb").lineWidth(1).stroke();
    doc.fillColor("#6b7280").font("Helvetica").fontSize(8).text(b.label, bx + 10, y + 10, { width: boxW - 20 });
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(12).text(b.value, bx + 10, y + 26, { width: boxW - 20 });
  });

  y += boxH + 18;
  return y;
}

function drawSectionTitle(doc, y, title) {
  const x = doc.page.margins.left;
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10).text(title.toUpperCase(), x, y);
  y += 10;
  doc.moveTo(x, y).lineTo(doc.page.width - doc.page.margins.right, y).lineWidth(1).strokeColor("#e5e7eb").stroke();
  return y + 12;
}

function drawSensorsTable(doc, y, data) {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const col = {
    var: Math.floor(width * 0.30),
    min: Math.floor(width * 0.14),
    avg: Math.floor(width * 0.14),
    max: Math.floor(width * 0.14),
    ref: width - (Math.floor(width * 0.30) + Math.floor(width * 0.14) * 3)
  };

  const rowH = 20;
  doc.rect(x, y, width, rowH).fill("#f3f4f6");
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9);
  doc.text("Variable", x + 8, y + 6, { width: col.var - 16 });
  doc.text("Mín", x + col.var + 8, y + 6, { width: col.min - 16 });
  doc.text("Prom", x + col.var + col.min + 8, y + 6, { width: col.avg - 16 });
  doc.text("Máx", x + col.var + col.min + col.avg + 8, y + 6, { width: col.max - 16 });
  doc.text("Referencia", x + col.var + col.min + col.avg + col.max + 8, y + 6, { width: col.ref - 16 });

  y += rowH;
  doc.fillColor("#111827").font("Helvetica").fontSize(9);

  const thresholds = data?.thresholds || {};
  const rows = [
    {
      variable: "Humedad (%)",
      min: fmtNumber(data?.sensores?.humedad?.min),
      avg: fmtNumber(data?.sensores?.humedad?.avg),
      max: fmtNumber(data?.sensores?.humedad?.max),
      ref: `Umbral riego: ${fmtNumber(thresholds.humedad_min_riego)}%`
    },
    {
      variable: "Temperatura (C)",
      min: fmtNumber(data?.sensores?.temperatura?.min),
      avg: fmtNumber(data?.sensores?.temperatura?.avg),
      max: fmtNumber(data?.sensores?.temperatura?.max),
      ref: `Rango: ${fmtNumber(thresholds.temperatura_min)}-${fmtNumber(thresholds.temperatura_max)} C`
    },
    {
      variable: "Nitrógeno (mg/kg)",
      min: fmtNumber(data?.sensores?.nitrogeno?.min, 1),
      avg: fmtNumber(data?.sensores?.nitrogeno?.avg, 1),
      max: fmtNumber(data?.sensores?.nitrogeno?.max, 1),
      ref: "Monitoreo continuo"
    }
  ];

  rows.forEach((r, idx) => {
    const fill = idx % 2 === 0 ? "#ffffff" : "#fafafa";
    doc.rect(x, y, width, rowH).fill(fill);
    doc.fillColor("#111827");
    doc.text(r.variable, x + 8, y + 6, { width: col.var - 16 });
    doc.text(r.min, x + col.var + 8, y + 6, { width: col.min - 16 });
    doc.text(r.avg, x + col.var + col.min + 8, y + 6, { width: col.avg - 16 });
    doc.text(r.max, x + col.var + col.min + col.avg + 8, y + 6, { width: col.max - 16 });
    doc.text(r.ref, x + col.var + col.min + col.avg + col.max + 8, y + 6, { width: col.ref - 16 });
    y += rowH;
  });

  doc.rect(x, y - rowH * rows.length - rowH, width, rowH * (rows.length + 1)).strokeColor("#e5e7eb").lineWidth(1).stroke();
  return y + 14;
}

function drawOperationBlock(doc, y, data) {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const leftW = Math.floor((width - 12) / 2);
  const rightW = width - 12 - leftW;
  const boxH = 92;

  const riegos = data?.operacion?.riegos || {};

  doc.roundedRect(x, y, leftW, boxH, 8).strokeColor("#e5e7eb").lineWidth(1).stroke();
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10).text("Riego (estimación)", x + 12, y + 12);
  doc.font("Helvetica").fontSize(9).fillColor("#111827");
  doc.text(`Eventos: ${riegos.eventos ?? 0}`, x + 12, y + 32);
  doc.text(`Segundos bomba: ${riegos.segundos_totales ?? 0} s`, x + 12, y + 48);
  doc.text(`Litros estimados: ${fmtNumber(riegos.litros_estimados, 3)} L`, x + 12, y + 64);
  doc.font("Helvetica").fontSize(8).fillColor("#6b7280").text(`Caudal nominal: ${fmtNumber(data?.caudal_lph, 0)} L/h`, x + 12, y + 80);

  doc.roundedRect(x + leftW + 12, y, rightW, boxH, 8).strokeColor("#e5e7eb").lineWidth(1).stroke();
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10).text("Operación (periodo)", x + leftW + 24, y + 12);
  doc.font("Helvetica").fontSize(9).fillColor("#111827");
  doc.text(`Tareas creadas: ${data?.operacion?.tareas_creadas ?? 0}`, x + leftW + 24, y + 32);
  doc.text(`Bitácoras: ${data?.operacion?.bitacoras ?? 0}`, x + leftW + 24, y + 48);
  const estados = data?.operacion?.tareas_por_estado || {};
  const estadosText = Object.entries(estados)
    .map(([k, v]) => `${k}:${v}`)
    .join(" - ");
  doc.font("Helvetica").fontSize(8).fillColor("#6b7280").text(`Estados: ${estadosText || "-"}`, x + leftW + 24, y + 66, { width: rightW - 24 });

  return y + boxH + 14;
}

function drawEvidenceTable(doc, y, data, opts) {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const evidence = Array.isArray(data?.operacion?.evidencia) ? data.operacion.evidencia : [];

  if (evidence.length === 0) {
    doc.fillColor("#6b7280").font("Helvetica").fontSize(9).text("Sin bitácoras en este periodo.", x, y);
    return y + 18;
  }

  const col = {
    reg: Math.floor(width * 0.42),
    sector: Math.floor(width * 0.12),
    tarea: Math.floor(width * 0.08),
    riego: Math.floor(width * 0.12),
    user: width - (Math.floor(width * 0.42) + Math.floor(width * 0.12) + Math.floor(width * 0.08) + Math.floor(width * 0.12))
  };

  const rowH = 18;
  const drawHeaderRow = (yy) => {
    doc.rect(x, yy, width, rowH).fill("#f3f4f6");
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(8);
    doc.text("Registro", x + 6, yy + 5, { width: col.reg - 12 });
    doc.text("Sector", x + col.reg + 6, yy + 5, { width: col.sector - 12 });
    doc.text("Tarea", x + col.reg + col.sector + 6, yy + 5, { width: col.tarea - 12 });
    doc.text("Riego", x + col.reg + col.sector + col.tarea + 6, yy + 5, { width: col.riego - 12 });
    doc.text("Usuario", x + col.reg + col.sector + col.tarea + col.riego + 6, yy + 5, { width: col.user - 12 });
    return yy + rowH;
  };

  y = ensurePageSpace(doc, y, rowH * 2, opts);
  y = drawHeaderRow(y);
  doc.font("Helvetica").fontSize(8).fillColor("#111827");

  for (let i = 0; i < evidence.length; i += 1) {
    y = ensurePageSpace(doc, y, rowH, opts);
    const b = evidence[i];
    const fill = i % 2 === 0 ? "#ffffff" : "#fafafa";
    doc.rect(x, y, width, rowH).fill(fill);

    const titulo = safeText(b.titulo);
    const tareaId = b.id_tarea ? `#${b.id_tarea}` : "-";
    const riego = b.riego_seg ? `${b.riego_seg}s ${fmtNumber(b.litros_estimados, 3)}L` : "-";
    doc.fillColor("#111827");
    doc.text(titulo, x + 6, y + 5, { width: col.reg - 12, ellipsis: true });
    doc.text(safeText(b.sector), x + col.reg + 6, y + 5, { width: col.sector - 12, ellipsis: true });
    doc.text(tareaId, x + col.reg + col.sector + 6, y + 5, { width: col.tarea - 12, ellipsis: true });
    doc.text(riego, x + col.reg + col.sector + col.tarea + 6, y + 5, { width: col.riego - 12, ellipsis: true });
    doc.text(safeText(b.usuario_correo), x + col.reg + col.sector + col.tarea + col.riego + 6, y + 5, { width: col.user - 12, ellipsis: true });
    y += rowH;
  }

  return y + 10;
}

function drawFooter(doc, meta) {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.page.height - doc.page.margins.bottom - 16;
  doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
  doc.text("Documento generado automáticamente por CEAA. Fuente de sensores: Firebase - Operación: MySQL", x, y, {
    width,
    lineBreak: false
  });
}

export function streamReportePdf({ res, data, type }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 36,
        info: {
          Title: `CEAA - Reporte ${type}`,
          Author: "CEAA"
        }
      });

      const opts = {
        marginTop: doc.page.margins.top,
        marginBottom: doc.page.margins.bottom
      };

      doc.once("error", reject);
      res.once("error", reject);
      res.once("close", () => resolve());
      res.once("finish", () => resolve());

      const drawFooterSafe = () => {
        const prevX = doc.x;
        const prevY = doc.y;
        doc.save();
        drawFooter(doc, {});
        doc.restore();
        doc.x = prevX;
        doc.y = prevY;
      };

      doc.on("pageAdded", () => {
        drawFooterSafe();
      });

      res.setHeader("Content-Type", "application/pdf");
      const start = data?.range?.start ? new Date(data.range.start).toISOString().slice(0, 10) : "sin-fecha";
      const end = data?.range?.end ? new Date(data.range.end).toISOString().slice(0, 10) : "sin-fecha";
      const filename = `CEAA-reporte-${type}-${start}-${end}.pdf`;
      res.setHeader("Content-Disposition", `attachment; filename=\"${sanitizePdfText(filename)}\"`);

      doc.pipe(res);

      const title = type === "semanal" ? "Reporte semanal" : "Reporte diario";
      const subtitle =
        data?.range?.start && data?.range?.end ? `${fmtDate(data.range.start)} -> ${fmtDate(data.range.end)}` : "-";

      let y = drawHeader(doc, data, { title, subtitle, generatedAt: new Date().toISOString() });
      y = ensurePageSpace(doc, y, 40, opts);

      y = drawSectionTitle(doc, y, "Indicadores de sensores");
      y = ensurePageSpace(doc, y, 120, opts);
      y = drawSensorsTable(doc, y, data);

      y = ensurePageSpace(doc, y, 120, opts);
      y = drawSectionTitle(doc, y, "Riego y operacion");
      y = ensurePageSpace(doc, y, 110, opts);
      y = drawOperationBlock(doc, y, data);

      y = ensurePageSpace(doc, y, 120, opts);
      y = drawSectionTitle(doc, y, "Evidencias (bitacoras)");
      y = drawEvidenceTable(doc, y, data, opts);

      drawFooterSafe();
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
