import http from "node:http";
import process from "node:process";
import { Worker } from "bullmq";
import Redis from "ioredis";
import { z } from "zod";
import { loadEnv } from "@tradesperson/config";

const env = loadEnv();
const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const queueConnection = { url: env.REDIS_URL };

const emailJobSchema = z.object({
  tenantId: z.string().uuid(),
  correlationId: z.string().min(1),
  recipient: z.string().email(),
  template: z.string().min(1),
  templateData: z.record(z.string(), z.unknown()),
});

let lastProcessedAt: string | null = null;

const worker = new Worker(
  "email",
  async (job) => {
    const payload = emailJobSchema.parse(job.data);
    lastProcessedAt = new Date().toISOString();

    console.log(
      JSON.stringify({
        level: "info",
        msg: "Processed email job",
        queue: "email",
        tenantId: payload.tenantId,
        correlationId: payload.correlationId,
        recipient: payload.recipient,
        template: payload.template,
        preview: payload.templateData,
      }),
    );
  },
  {
    connection: queueConnection,
    concurrency: 5,
  },
);

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", queue: "email", lastProcessedAt }));
    return;
  }

  if (req.url === "/ready") {
    const pong = await redis.ping();
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ready", redis: pong }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(4100);

const shutdown = async () => {
  await worker.close();
  await redis.quit();
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
