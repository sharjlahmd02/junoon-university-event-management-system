import express from "express";
import helmet from "helmet";
import cors from "cors";
import mongoSanitize from "./middleware/mongoSanitize.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import twoFactorRoutes from "./routes/twoFactorRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(helmet());

// Locked to a single allowed origin, not a wildcard.
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

// JSON body size cap — file uploads use multipart, not this parser.
app.use(express.json({ limit: "20kb" }));

// Strips Mongo operators ($, .) from req.body/params/query to block injection.
app.use(mongoSanitize());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/auth/2fa", twoFactorRoutes);
app.use("/api/events", eventRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;