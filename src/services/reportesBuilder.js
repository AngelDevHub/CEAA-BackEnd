import { SensorModel } from "../models/sensorModel.js";
import ConfigModel from "../models/config.model.js";
import TareasModel from "../models/tareas.model.js";
import BitacorasModel from "../models/bitacoras.model.js";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function summarizeNumericSeries(values) {
  const cleaned = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (cleaned.length === 0) return { min: null, max: null, avg: null, count: 0 };
  let min = cleaned[0];
  let max = cleaned[0];
  let sum = 0;
  for (const v of cleaned) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, avg: Number((sum / cleaned.length).toFixed(2)), count: cleaned.length };
}

function computeSecondsUnderThreshold(samples, threshold) {
  if (!threshold || !Number.isFinite(threshold)) return 0;
  const points = samples
    .map((s) => ({
      t: safeDate(s.timestamp)?.getTime() ?? null,
      h: toNumber(s.humedad)
    }))
    .filter((p) => p.t !== null && typeof p.h === "number")
    .sort((a, b) => a.t - b.t);

  if (points.length < 2) return 0;

  let seconds = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    const dt = (cur.t - prev.t) / 1000;
    if (dt <= 0 || dt > 60 * 60) continue;
    if (prev.h < threshold && cur.h < threshold) seconds += dt;
  }
  return Math.round(seconds);
}

function estimateInHoursTrend(samples, field, hoursAhead) {
  const points = samples
    .map((s) => ({
      t: safeDate(s.timestamp)?.getTime() ?? null,
      v: toNumber(s[field])
    }))
    .filter((p) => p.t !== null && typeof p.v === "number")
    .sort((a, b) => a.t - b.t);

  if (points.length < 5) return null;

  const start = points[0];
  const end = points[points.length - 1];
  const dtHours = (end.t - start.t) / (1000 * 60 * 60);
  if (dtHours <= 0) return null;

  const slopePerHour = (end.v - start.v) / dtHours;
  const predicted = end.v + slopePerHour * hoursAhead;
  return {
    last: Number(end.v.toFixed(2)),
    slope_per_hour: Number(slopePerHour.toFixed(3)),
    predicted: Number(predicted.toFixed(2))
  };
}

function parseRange(req, defaultHoursBack) {
  const end = req.query?.end ? safeDate(req.query.end) : new Date();
  const start = req.query?.start
    ? safeDate(req.query.start)
    : new Date(Date.now() - defaultHoursBack * 60 * 60 * 1000);
  const startIso = (start || new Date(Date.now() - defaultHoursBack * 60 * 60 * 1000)).toISOString();
  const endIso = (end || new Date()).toISOString();
  return { start: startIso, end: endIso };
}

async function getThresholds() {
  const t = await ConfigModel.get("alertas.thresholds");
  const v = t?.value && typeof t.value === "object" ? t.value : {};
  return {
    humedad_min_riego: Number.isFinite(Number(v.humedad_min_riego)) ? Number(v.humedad_min_riego) : 45,
    nitrogeno_min: Number.isFinite(Number(v.nitrogeno_min)) ? Number(v.nitrogeno_min) : 0,
    temperatura_min: Number.isFinite(Number(v.temperatura_min)) ? Number(v.temperatura_min) : 0,
    temperatura_max: Number.isFinite(Number(v.temperatura_max)) ? Number(v.temperatura_max) : 50
  };
}

async function getCaudalLph() {
  const c = await ConfigModel.get("riego.caudal_lph");
  const n = Number(c?.value);
  return Number.isFinite(n) && n > 0 ? n : 100;
}

function extractCanManageUsers(req) {
  return Array.isArray(req.user?.permissions) && req.user.permissions.includes("manage:users");
}

export async function buildReporteDiario(req) {
  const canManageUsers = extractCanManageUsers(req);
  const range = parseRange(req, 24);
  const startDate = new Date(range.start);
  const endDate = new Date(range.end);
  const thresholds = await getThresholds();
  const caudal_lph = await getCaudalLph();

  const { data: sensores } = await SensorModel.getRangeByTimestamp({ startIso: range.start, endIso: range.end });
  const humedad = summarizeNumericSeries(sensores.map((s) => toNumber(s.humedad)).filter((v) => v !== null));
  const temperatura = summarizeNumericSeries(sensores.map((s) => toNumber(s.temperatura)).filter((v) => v !== null));
  const nitrogeno = summarizeNumericSeries(sensores.map((s) => toNumber(s.nitrogeno)).filter((v) => v !== null));

  const secondsUnder = computeSecondsUnderThreshold(sensores, thresholds.humedad_min_riego);
  const trend4h = estimateInHoursTrend(sensores.slice(-60), "humedad", 4);
  const riesgo4h =
    trend4h && typeof thresholds.humedad_min_riego === "number"
      ? trend4h.predicted < thresholds.humedad_min_riego
        ? "alto"
        : "bajo"
      : "desconocido";

  const tareas = canManageUsers ? await TareasModel.findAll() : await TareasModel.findByAssignee(req.user.id_usuario);
  const tareasEnRango = tareas.filter((t) => {
    const created = safeDate(t.creado_en)?.getTime();
    if (!created) return false;
    return created >= startDate.getTime() && created <= endDate.getTime();
  });

  const bitacoras = await BitacorasModel.findBetween({
    start: startDate,
    end: endDate,
    id_usuario: canManageUsers ? null : req.user.id_usuario
  });

  const riegos = bitacoras.filter((b) => Number.isFinite(Number(b.riego_seg)) && Number(b.riego_seg) > 0);
  const litrosTotales = Number(riegos.reduce((acc, b) => acc + (Number(b.litros_estimados) || 0), 0).toFixed(3));
  const segundosTotales = riegos.reduce((acc, b) => acc + (Number(b.riego_seg) || 0), 0);

  return {
    range,
    thresholds,
    caudal_lph,
    sensores: {
      count: sensores.length,
      humedad,
      temperatura,
      nitrogeno,
      seconds_under_humidity_threshold: secondsUnder,
      trend_4h: trend4h,
      riesgo_4h: riesgo4h
    },
    operacion: {
      tareas_creadas: tareasEnRango.length,
      tareas_por_estado: tareasEnRango.reduce((acc, t) => {
        const k = t.estado || "desconocido";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {}),
      bitacoras: bitacoras.length,
      riegos: {
        eventos: riegos.length,
        segundos_totales: segundosTotales,
        litros_estimados: litrosTotales
      },
      evidencia: bitacoras.slice(0, 25)
    }
  };
}

export async function buildReporteSemanal(req) {
  const canManageUsers = extractCanManageUsers(req);
  const range = parseRange(req, 24 * 7);
  const startDate = new Date(range.start);
  const endDate = new Date(range.end);
  const thresholds = await getThresholds();
  const caudal_lph = await getCaudalLph();

  const { data: sensores } = await SensorModel.getRangeByTimestamp({ startIso: range.start, endIso: range.end });
  const humedad = summarizeNumericSeries(sensores.map((s) => toNumber(s.humedad)).filter((v) => v !== null));
  const temperatura = summarizeNumericSeries(sensores.map((s) => toNumber(s.temperatura)).filter((v) => v !== null));
  const nitrogeno = summarizeNumericSeries(sensores.map((s) => toNumber(s.nitrogeno)).filter((v) => v !== null));
  const secondsUnder = computeSecondsUnderThreshold(sensores, thresholds.humedad_min_riego);

  const tareas = canManageUsers ? await TareasModel.findAll() : await TareasModel.findByAssignee(req.user.id_usuario);
  const tareasEnRango = tareas.filter((t) => {
    const created = safeDate(t.creado_en)?.getTime();
    if (!created) return false;
    return created >= startDate.getTime() && created <= endDate.getTime();
  });

  const bitacoras = await BitacorasModel.findBetween({
    start: startDate,
    end: endDate,
    id_usuario: canManageUsers ? null : req.user.id_usuario
  });

  const riegos = bitacoras.filter((b) => Number.isFinite(Number(b.riego_seg)) && Number(b.riego_seg) > 0);
  const litrosTotales = Number(riegos.reduce((acc, b) => acc + (Number(b.litros_estimados) || 0), 0).toFixed(3));
  const segundosTotales = riegos.reduce((acc, b) => acc + (Number(b.riego_seg) || 0), 0);

  return {
    range,
    thresholds,
    caudal_lph,
    sensores: {
      count: sensores.length,
      humedad,
      temperatura,
      nitrogeno,
      seconds_under_humidity_threshold: secondsUnder
    },
    operacion: {
      tareas_creadas: tareasEnRango.length,
      tareas_por_estado: tareasEnRango.reduce((acc, t) => {
        const k = t.estado || "desconocido";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {}),
      bitacoras: bitacoras.length,
      riegos: {
        eventos: riegos.length,
        segundos_totales: segundosTotales,
        litros_estimados: litrosTotales
      },
      evidencia: bitacoras.slice(0, 40)
    }
  };
}

