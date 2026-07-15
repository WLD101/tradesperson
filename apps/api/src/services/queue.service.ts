import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { loadEnv } from "../../../../packages/config/src";
import { RedisService } from "./redis.service";

@Injectable()
export class QueueService {
  readonly emailQueue: Queue;

  constructor(_redis: RedisService) {
    const env = loadEnv();
    this.emailQueue = new Queue("email", {
      connection: { url: env.REDIS_URL },
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
}
