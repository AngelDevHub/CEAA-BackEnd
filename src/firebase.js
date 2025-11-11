import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

console.log("🔥 Firebase inicializado correctamente");

const db = admin.database();
export { admin, db };



/*import admin from "firebase-admin";
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
*/