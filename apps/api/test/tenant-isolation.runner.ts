import assert from "node:assert/strict";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/modules/app.module";
import { PrismaService } from "../src/services/prisma.service";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import {
  disconnectDatabase,
  recreateTestDatabase,
  resetDatabase,
} from "./helpers/test-db";
import {
  createIsolationFixtures,
  signInThroughApi,
  type IsolationFixtureSet,
} from "./helpers/tenant-fixtures";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";

type TestCase = {
  name: string;
  run: () => Promise<void>;
};

const baseUrl = "http://127.0.0.1:4000";

class HttpClient {
  private cookieHeader = "";

  constructor(private readonly origin: string) {}

  get(path: string) {
    return this.request("GET", path);
  }

  post(path: string) {
    return {
      send: (body?: unknown) => this.request("POST", path, body),
    };
  }

  patch(path: string) {
    return {
      send: (body?: unknown) => this.request("PATCH", path, body),
    };
  }

  put(path: string) {
    return {
      send: (body?: unknown) => this.request("PUT", path, body),
    };
  }

  delete(path: string) {
    return this.request("DELETE", path);
  }

  private async request(method: string, path: string, body?: unknown) {
    const response = await fetch(`${this.origin}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(this.cookieHeader ? { cookie: this.cookieHeader } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const setCookies =
      typeof (response.headers as Headers & { getSetCookie?: () => string[] })
        .getSetCookie === "function"
        ? (response.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
        : [];

    if (setCookies.length) {
      this.cookieHeader = setCookies.map((value) => value.split(";")[0]).join("; ");
    }

    const payload = await response.json();
    return {
      status: response.status,
      body: payload,
    };
  }
}

let app: any;
let ownerAAgent: HttpClient;
let ownerBAgent: HttpClient;
let branchA1Agent: HttpClient;
let fixtures: IsolationFixtureSet;

const startServer = async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:55432/tradesperson_erp_isolation_test";
  process.env.DIRECT_URL = "postgresql://postgres:postgres@localhost:55432/tradesperson_erp_isolation_test";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.WEB_URL = "http://localhost:3000";
  process.env.API_URL = "http://localhost:4000";
  process.env.INTERNAL_API_URL = "http://localhost:4000";
  process.env.AUTH_SECRET = "test-secret-value-1234567890";
  process.env.AUTH_ISSUER = "tradesperson-net-erp-test";
  process.env.AUTH_AUDIENCE = "tradesperson-erp-test-users";
  process.env.COOKIE_DOMAIN = "localhost";
  
  app = await NestFactory.create(AppModule, new FastifyAdapter(), { logger: false });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.use(cookieParser());
  await app.listen(4000, "127.0.0.1");
};

const setupCase = async () => {
  await resetDatabase();
  fixtures = await createIsolationFixtures();
  ownerAAgent = new HttpClient(baseUrl);
  ownerBAgent = new HttpClient(baseUrl);
  branchA1Agent = new HttpClient(baseUrl);
  await signInThroughApi(ownerAAgent, fixtures.ownerA.user.email);
  await signInThroughApi(ownerBAgent, fixtures.ownerB.user.email);
  await signInThroughApi(branchA1Agent, fixtures.branchUserA1.user.email);
};

const tests: TestCase[] = [
  {
    name: "tenant A cannot retrieve tenant B branch by id",
    run: async () => {
      const response = await ownerAAgent.get(`/api/v1/branches/${fixtures.branchB1.id}`);
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant-owned list endpoints exclude tenant B records",
    run: async () => {
      const [branches, memberships, invitations, auditLogs, leads, customers, sites] =
        await Promise.all([
          ownerAAgent.get("/api/v1/branches"),
          ownerAAgent.get(`/api/v1/tenants/${fixtures.tenantA.id}/memberships`),
          ownerAAgent.get(`/api/v1/tenants/${fixtures.tenantA.id}/invitations`),
          ownerAAgent.get("/api/v1/audit-logs"),
          ownerAAgent.get("/api/v1/leads"),
          ownerAAgent.get("/api/v1/customers"),
          ownerAAgent.get("/api/v1/sites"),
        ]);

      assert.equal(branches.status, 200);
      assert.deepEqual(
        branches.body.data.map((item: { id: string }) => item.id).sort(),
        [fixtures.branchA1.id, fixtures.branchA2.id].sort(),
      );
      assert.deepEqual(
        sites.body.data.map((item: { id: string }) => item.id).sort(),
        [fixtures.siteA1.id, fixtures.siteA2.id].sort(),
      );
    },
  },
  {
    name: "tenant A cannot create lead against tenant B branch id",
    run: async () => {
      const response = await ownerAAgent.post("/api/v1/leads").send({
        firstName: "Mallory",
        lastName: "CrossTenant",
        email: "mallory@example.test",
        branchId: fixtures.branchB1.id,
      });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot create site against tenant B customer reference",
    run: async () => {
      const response = await ownerAAgent.post("/api/v1/sites").send({
        customerId: fixtures.customerB1.id,
        branchId: fixtures.branchA1.id,
        label: "Cross Tenant Site",
      });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot create survey against tenant B site",
    run: async () => {
      const response = await ownerAAgent.post("/api/v1/surveys").send({
        siteId: fixtures.siteB1.id,
        customerId: fixtures.customerB1.id, // Must also match tenant
        reference: "SURV-123",
      });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot retrieve tenant B survey",
    run: async () => {
      // First create survey in tenant B
      const sB = await ownerBAgent.post("/api/v1/surveys").send({
        siteId: fixtures.siteB1.id,
        customerId: fixtures.customerB1.id,
        reference: "B-SURV",
      });
      assert.equal(sB.status, 201);
      
      const response = await ownerAAgent.get(`/api/v1/surveys/${sB.body.id}`);
      assert.equal(response.status, 404);
    },
  },
  {
    name: "survey lifecycle transitions",
    run: async () => {
      const survey = await ownerAAgent.post("/api/v1/surveys").send({
        siteId: fixtures.siteA1.id,
        customerId: fixtures.customerA1.id,
        reference: "TEST-LIFECYCLE",
      });
      assert.equal(survey.status, 201);
      const sId = survey.body.id;

      // DRAFT -> SCHEDULED
      let res = await ownerAAgent.patch(`/api/v1/surveys/${sId}/status`).send({ status: "SCHEDULED" });
      assert.equal(res.status, 200);

      // SCHEDULED -> IN_PROGRESS
      res = await ownerAAgent.patch(`/api/v1/surveys/${sId}/status`).send({ status: "IN_PROGRESS" });
      assert.equal(res.status, 200);

      // IN_PROGRESS -> COMPLETED
      res = await ownerAAgent.patch(`/api/v1/surveys/${sId}/status`).send({ status: "COMPLETED" });
      assert.equal(res.status, 200);

      // COMPLETED -> REVIEWED
      res = await ownerAAgent.patch(`/api/v1/surveys/${sId}/status`).send({ status: "REVIEWED" });
      assert.equal(res.status, 200);

      // REVIEWED -> APPROVED
      res = await ownerAAgent.patch(`/api/v1/surveys/${sId}/status`).send({ status: "APPROVED" });
      assert.equal(res.status, 200);

      // Invalid transition: APPROVED -> DRAFT
      res = await ownerAAgent.patch(`/api/v1/surveys/${sId}/status`).send({ status: "DRAFT" });
      assert.equal(res.status, 400);

      // Approved survey cannot receive rooms
      res = await ownerAAgent.post(`/api/v1/surveys/${sId}/rooms`).send({ name: "Post-Approval Room" });
      assert.equal(res.status, 400);
      assert.ok(res.body.message.includes("Cannot add rooms to a APPROVED survey"));
    },
  },
  {
    name: "tenant A cannot update tenant B room",
    run: async () => {
      const sB = await ownerBAgent.post("/api/v1/surveys").send({
        siteId: fixtures.siteB1.id,
        customerId: fixtures.customerB1.id,
        reference: "B-ROOM-TEST",
      });
      const roomB = await ownerBAgent.post(`/api/v1/surveys/${sB.body.id}/rooms`).send({ name: "Living Room" });
      
      const response = await ownerAAgent.patch(`/api/v1/surveys/${sB.body.id}/rooms/${roomB.body.id}`).send({ name: "Hacked" });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "client-calculated area tampering is ignored",
    run: async () => {
      const sA = await ownerAAgent.post("/api/v1/surveys").send({
        siteId: fixtures.siteA1.id,
        customerId: fixtures.customerA1.id,
        reference: "A-COMP-TEST",
      });
      const roomA = await ownerAAgent.post(`/api/v1/surveys/${sA.body.id}/rooms`).send({ name: "Living Room" });
      
      const comp = await ownerAAgent.post(`/api/v1/surveys/${sA.body.id}/rooms/${roomA.body.id}/components`).send({
        type: "RECTANGLE",
        dimensions: { length: 2, width: 2 }, // area should be 4
        calculatedArea: 9999, // tampered area
      });
      
      // Should ignore 9999 and use 4
      assert.equal(comp.status, 201);
      assert.equal(comp.body.calculatedArea, "4");
    }
  }
];

const main = async () => {
  const startedAt = Date.now();
  let failed = 0;

  await recreateTestDatabase();
  await startServer();

  for (const test of tests) {
    await setupCase();
    try {
      await test.run();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  await app.close();
  await disconnectDatabase();

  const passed = tests.length - failed;
  console.log(`tenant isolation tests: ${passed} passed, ${failed} failed in ${Date.now() - startedAt}ms`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

void main();
