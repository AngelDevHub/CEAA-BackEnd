// firebaseConfig.js
import admin from "firebase-admin";
import { readFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = JSON.parse(
  readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fir-adminsdk-ceaa-default-rtdb.firebaseio.com"
});
console.log("🔥 Firebase inicializado correctamente");
const db = admin.database();

export { admin, db };
