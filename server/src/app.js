import express from "express";
import helmet from "helmet";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import healthRoutes from "./routes/healthRoutes.js";
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

app.use(notFound);
app.use(errorHandler);

export default app;