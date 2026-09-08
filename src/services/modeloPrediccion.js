import * as tf from "@tensorflow/tfjs";

let isTraining = false;

export function crearModelo() {
  const modelo = tf.sequential();

  modelo.add(tf.layers.dense({ units: 8, inputShape: [3], activation: "relu" }));
  modelo.add(tf.layers.dense({ units: 8, activation: "relu" }));
  modelo.add(tf.layers.dense({ units: 3 })); 

  modelo.compile({
    optimizer: tf.train.adam(0.01),
    loss: "meanSquaredError",
  });

  return modelo;
}

export async function entrenarModelo(modelo, datosEntrenamiento) {
  if (isTraining) {
    return modelo;
  }

  if (!Array.isArray(datosEntrenamiento) || datosEntrenamiento.length < 5) {
    return modelo;
  }

  isTraining = true;

  try {
    const entradas = datosEntrenamiento.map((d) => [
      (d.temperatura ?? 0) / 100,
      (d.humedad ?? 0) / 100,
      (d.nitrogeno ?? 0) / 500,
    ]);

    const salidas = entradas.slice(1).concat([entradas[entradas.length - 1]]);

    const xs = tf.tensor2d(entradas.slice(0, -1));
    const ys = tf.tensor2d(salidas.slice(0, -1));

    await modelo.fit(xs, ys, {
      epochs: 25,
      batchSize: 4,
      verbose: 0,
    });

    xs.dispose();
    ys.dispose();
  } catch (error) {
  } finally {
    isTraining = false;
  }

  return modelo;
}

export async function generarPredicciones(modelo, ultimoDato) {
  if (!ultimoDato) return [];

  const input = tf.tensor2d([
    [
      (ultimoDato.temperatura ?? 0) / 100,
      (ultimoDato.humedad ?? 0) / 100,
      (ultimoDato.nitrogeno ?? 0) / 500,
    ],
  ]);

  const resultado = modelo.predict(input);
  const valores = await resultado.array();

  let [temp, hum, nit] = valores[0];

  temp *= 100;
  hum *= 100;
  nit *= 500;

  input.dispose();
  resultado.dispose();

  const predicciones = [];
  for (let i = 1; i <= 4; i++) {
    predicciones.push({
      time: `${12 + i}:00`,
      temp: +Math.max(0, (temp + Math.random() * 0.3 - 0.15)).toFixed(1),
      humidity: +Math.max(0, (hum + Math.random() * 0.3 - 0.15)).toFixed(1),
      nitrogen: +Math.max(0, (nit + Math.random() * 5 - 2.5)).toFixed(1),
    });
  }

  return predicciones;
}


export function calcularIndiceCrecimiento(temp, humedad, nitrogeno, cropConfig = null) {
  // Valores por defecto (Rábano) o dinámicos según el cultivo configurado en Firebase /configuracion
  const minHum = cropConfig?.humedadMinima !== undefined ? Number(cropConfig.humedadMinima) : 45;
  const maxTemp = cropConfig?.tempMaxima !== undefined ? Number(cropConfig.tempMaxima) : 35;
  const maxN = cropConfig?.nitrogenoMax !== undefined ? Number(cropConfig.nitrogenoMax) : 20;

  // Calculamos valores ideales óptimos en función de la variedad de cultivo
  const idealTemp = Math.max(15, maxTemp - 10);
  const idealHum = Math.min(90, minHum + 15);
  const idealN = Math.max(1, maxN / 2);

  // Normalización: evaluación del estado frente a las necesidades del cultivo seleccionado
  const tempScore = Math.max(0, 100 - Math.abs(temp - idealTemp) * 4);
  const humScore = Math.max(0, 100 - Math.abs(humedad - idealHum) * 2);
  const nScore = Math.max(0, 100 - Math.abs(nitrogeno - idealN) * 5);

  // Promedio ponderado
  const indice = (tempScore * 0.4 + humScore * 0.35 + nScore * 0.25) / 100;

  // Devuelve un valor entre 0 y 1
  return Number(indice.toFixed(2));
}

