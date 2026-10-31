import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import apiRoutes from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { auth } from "./lib/auth.js"; // Apnar Better Auth config file-er correct path দিন
import { toNodeHandler } from "better-auth/node";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

// NOTE: Better Auth handler should be placed BEFORE express.json() if it expects raw/form data, 
// or handled via toNodeHandler which supports standard express req/res.
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;