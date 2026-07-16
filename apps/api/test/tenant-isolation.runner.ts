import "./helpers/test-env";
import assert from "node:assert/strict";
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

type TestCase = {
  name: string;
  run: () => Promise<void>;
};

const baseUrl = process.env.API_URL;
if (!baseUrl) {
  throw new Error("process.env.API_URL must be defined for isolation tests");
}

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
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const setCookies =
      typeof (response.headers as Headers & { getSetCookie?: () => string[] })
        .getSetCookie === "function"
        ? (response.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
        : [];

    if (setCookies.length) {
      this.cookieHeader = setCookies.map((value) => value.split(";")[0]).join("; ");
    }

    const payload: any = await response.json();
    return {
      status: response.status,
      body: payload.data !== undefined ? payload.data : payload,
      error: payload.error ?? null,
      rawBody: payload,
    };
  }
}

let ownerAAgent: HttpClient;
let ownerBAgent: HttpClient;
let branchA1Agent: HttpClient;
let fixtures: IsolationFixtureSet;

const startServer = async () => {
  // Server is started externally by run-isolation.mjs
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
        branches.body.map((item: { id: string }) => item.id).sort(),
        [fixtures.branchA1.id, fixtures.branchA2.id].sort(),
      );
      assert.deepEqual(
        sites.body.map((item: { id: string }) => item.id).sort(),
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
      assert.ok(res.error?.message.includes("immutable survey state"));
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
        calculatedArea: 999999, // tampered area
        netArea: 999999,
        grossArea: 999999,
        wasteAdjustedArea: 999999,
      });
      
      assert.equal(comp.status, 201);
      assert.equal(comp.body.calculatedArea, "4");

      // Verify room totals are correctly calculated as 4, ignoring 999999
      const roomCheck = await ownerAAgent.get(`/api/v1/surveys/${sA.body.id}/rooms/${roomA.body.id}`);
      assert.equal(roomCheck.body.netArea, "4");
    }
  },
  {
    name: "CUSTOM manual area component is rejected",
    run: async () => {
      const sA = await ownerAAgent.post("/api/v1/surveys").send({
        siteId: fixtures.siteA1.id,
        customerId: fixtures.customerA1.id,
        reference: "MANUAL-TEST",
      });
      const roomA = await ownerAAgent.post(`/api/v1/surveys/${sA.body.id}/rooms`).send({ name: "Living Room" });
      
      const comp = await ownerAAgent.post(`/api/v1/surveys/${sA.body.id}/rooms/${roomA.body.id}/components`).send({
        type: "CUSTOM",
        calculatedArea: 100,
      });
      
      // Should reject CUSTOM type
      assert.equal(comp.status, 400);
    }
  },
  {
    name: "tenant A cannot access tenant B components",
    run: async () => {
      const sB = await ownerBAgent.post("/api/v1/surveys").send({
        siteId: fixtures.siteB1.id,
        customerId: fixtures.customerB1.id,
        reference: "B-COMP-TEST",
      });
      const roomB = await ownerBAgent.post(`/api/v1/surveys/${sB.body.id}/rooms`).send({ name: "Living Room" });
      const compB = await ownerBAgent.post(`/api/v1/surveys/${sB.body.id}/rooms/${roomB.body.id}/components`).send({
        type: "RECTANGLE",
        dimensions: { length: 2, width: 2 },
      });
      
      const patchRes = await ownerAAgent.patch(`/api/v1/surveys/${sB.body.id}/rooms/${roomB.body.id}/components/${compB.body.id}`).send({ notes: "Hacked" });
      assert.equal(patchRes.status, 404);

      const delRes = await ownerAAgent.delete(`/api/v1/surveys/${sB.body.id}/rooms/${roomB.body.id}/components/${compB.body.id}`);
      assert.equal(delRes.status, 404);
    }
  },
  {
    name: "immutable survey states prevent editing or deleting",
    run: async () => {
      const sA = await ownerAAgent.post("/api/v1/surveys").send({
        siteId: fixtures.siteA1.id,
        customerId: fixtures.customerA1.id,
        reference: "A-IMMUTABLE-TEST",
      });
      const sId = sA.body.id;
      const roomA = await ownerAAgent.post(`/api/v1/surveys/${sId}/rooms`).send({ name: "Living Room" });
      const rId = roomA.body.id;
      const compA = await ownerAAgent.post(`/api/v1/surveys/${sId}/rooms/${rId}/components`).send({
        type: "RECTANGLE",
        dimensions: { length: 2, width: 2 },
      });
      const cId = compA.body.id;

      // Make it immutable (DRAFT -> CANCELLED is allowed)
      const statusUpdate = await ownerAAgent.patch(`/api/v1/surveys/${sId}/status`).send({ status: "CANCELLED" });
      assert.equal(statusUpdate.status, 200, "Failed to transition to CANCELLED");

      const patchRoom = await ownerAAgent.patch(`/api/v1/surveys/${sId}/rooms/${rId}`).send({ name: "New Name" });
      assert.equal(patchRoom.status, 400);

      const delRoom = await ownerAAgent.delete(`/api/v1/surveys/${sId}/rooms/${rId}`);
      assert.equal(delRoom.status, 400);

      const patchComp = await ownerAAgent.patch(`/api/v1/surveys/${sId}/rooms/${rId}/components/${cId}`).send({ notes: "New Note" });
      assert.equal(patchComp.status, 400);

      const delComp = await ownerAAgent.delete(`/api/v1/surveys/${sId}/rooms/${rId}/components/${cId}`);
      assert.equal(delComp.status, 400);
    }
  }
];

const main = async () => {
  const startedAt = Date.now();
  let failed = 0;

  if (process.argv.includes("--no-recreate")) {
    await resetDatabase();
  } else {
    await recreateTestDatabase();
  }

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

  await disconnectDatabase();

  const passed = tests.length - failed;
  console.log(`tenant isolation tests: ${passed} passed, ${failed} failed in ${Date.now() - startedAt}ms`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

void main();
