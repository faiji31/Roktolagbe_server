import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function bootstrap() {
  try {
    await connectDB();

    app.listen(env.port, () => {
      console.log(`RoktoLagbe Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start RoktoLagbe server:", error);
    process.exit(1);
  }
}

bootstrap();