import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { loadEnv } from "../../../../packages/config/src";

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client = new Redis(loadEnv().REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  async ping() {
    if (this.client.status === "wait") {
      await this.client.connect();
    }

    return this.client.ping();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
