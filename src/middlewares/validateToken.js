import jwt from "jsonwebtoken";
import { TOKEN_SECRET } from "../config.js";

export const validateToken = (req, res, next) => {
    try {
        let token = req.cookies.token || req.headers.authorization?.split(" ")[1];

        console.log("TOKEN_SECRET:", TOKEN_SECRET);
        console.log("Token recibido:", token);

        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        jwt.verify(token, TOKEN_SECRET, (err, user) => {
            if (err) {
                console.error("Error al verificar token:", err);
                return res.status(403).json({ message: "Invalid token" });
            }

            req.user = user;
            next();
        });

    } catch (error) {
        console.error("Error en el middleware authRequired:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};
