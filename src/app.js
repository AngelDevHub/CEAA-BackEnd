import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import routes from './routes/routes.js';
import helmet from "helmet";



const app = express();

app.use(express.json());

const allowedOrigins = [
    "http://localhost:5173",
    "https://vital-air.vercel.app" 
];

app.use(
  helmet({
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("CORS not allowed"));
        }
    },
    credentials: true
}));



app.use(cookieParser());

app.use("/api", routes);

export default app;
