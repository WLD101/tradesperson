import "./helpers/test-env";
import assert from "node:assert/strict";
import {
  disconnectDatabase,
  prisma,
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
      sendFormData: (body: FormData) => this.request("POST", path, body),
    };
  }

  patch(path: string) {
    return {
      send: (body?: unknown) => this.request("PATCH", path, body),
      sendFormData: (body: FormData) => this.request("PATCH", path, body),
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
    const isFormData = body instanceof FormData;
    const response = await fetch(`${this.origin}${path}`, {
      method,
      headers: {
        ...(isFormData ? {} : { "content-type": "application/json" }),
        ...(this.cookieHeader ? { cookie: this.cookieHeader } : {}),
      },
      ...(body !== undefined
        ? {
            body: isFormData ? body : JSON.stringify(body),
          }
        : {}),
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
let staffAAgent: HttpClient;
let fixtures: IsolationFixtureSet;

const buildImportFormData = (csvText: string) => {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([csvText], { type: "text/csv" }),
    "supplier-prices.csv",
  );
  return formData;
};

const supplierPricingCsv =
  "supplier sku,price basis,currency,base cost,effective date\nSUP-A-CARPET-001,ROLL,GBP,12.5000,2026-07-18\n";

const createPriceImport = async (
  agent: HttpClient,
  supplierId: string,
  csvText = supplierPricingCsv,
) => {
  const response = await agent
    .post(`/api/v1/suppliers/${supplierId}/price-imports`)
    .sendFormData(buildImportFormData(csvText));
  assert.equal(response.status, 201);
  return response.body as { id: string };
};

const getPriceImportRows = async (
  agent: HttpClient,
  supplierId: string,
  importId: string,
) => {
  const response = await agent.get(
    `/api/v1/suppliers/${supplierId}/price-imports/${importId}/rows`,
  );
  assert.equal(response.status, 200);
  return response.body.items as Array<{ id: string }>;
};

const applyImportMapping = async (
  agent: HttpClient,
  supplierId: string,
  importId: string,
) => {
  const response = await agent.patch(
    `/api/v1/suppliers/${supplierId}/price-imports/${importId}/mapping`,
  ).send({
    mapping: buildSavedMapping().mapping,
  });
  assert.equal(response.status, 200);
};

const executeImportLifecycle = async (
  agent: HttpClient,
  supplierId: string,
  importId: string,
) => {
  const validateResponse = await agent.post(
    `/api/v1/suppliers/${supplierId}/price-imports/${importId}/validate`,
  ).send({});
  assert.equal(validateResponse.status, 201);

  const approveResponse = await agent.post(
    `/api/v1/suppliers/${supplierId}/price-imports/${importId}/approve`,
  ).send({});
  assert.equal(approveResponse.status, 201);

  const executeResponse = await agent.post(
    `/api/v1/suppliers/${supplierId}/price-imports/${importId}/execute`,
  ).send({});
  assert.equal(executeResponse.status, 201);

  return executeResponse.body as { id: string; priceListId: string };
};

const buildSavedMapping = () => ({
  name: "Standard CSV mapping",
  fileType: "CSV",
  mapping: {
    headers: [
      "supplier sku",
      "price basis",
      "currency",
      "base cost",
      "effective date",
    ],
    columns: {
      supplierSku: "supplier sku",
      priceBasis: "price basis",
      currency: "currency",
      baseCost: "base cost",
      effectiveDate: "effective date",
    },
  },
});

const startServer = async () => {
  // Server is started externally by run-isolation.mjs
};

const setupCase = async () => {
  await resetDatabase();
  fixtures = await createIsolationFixtures();
  ownerAAgent = new HttpClient(baseUrl);
  ownerBAgent = new HttpClient(baseUrl);
  branchA1Agent = new HttpClient(baseUrl);
  staffAAgent = new HttpClient(baseUrl);
  await signInThroughApi(ownerAAgent, fixtures.ownerA.user.email);
  await signInThroughApi(ownerBAgent, fixtures.ownerB.user.email);
  await signInThroughApi(branchA1Agent, fixtures.branchUserA1.user.email);
  await signInThroughApi(staffAAgent, fixtures.staffA.user.email);
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
      const [branches, memberships, invitations, auditLogs, leads, customers, sites, products, suppliers] =
        await Promise.all([
          ownerAAgent.get("/api/v1/branches"),
          ownerAAgent.get(`/api/v1/tenants/${fixtures.tenantA.id}/memberships`),
          ownerAAgent.get(`/api/v1/tenants/${fixtures.tenantA.id}/invitations`),
          ownerAAgent.get("/api/v1/audit-logs"),
          ownerAAgent.get("/api/v1/leads"),
          ownerAAgent.get("/api/v1/customers"),
          ownerAAgent.get("/api/v1/sites"),
          ownerAAgent.get("/api/v1/catalogue/products"),
          ownerAAgent.get("/api/v1/suppliers"),
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
      assert.deepEqual(
        products.body.items.map((item: { id: string }) => item.id).sort(),
        [fixtures.productA.id].sort(),
      );
      assert.deepEqual(
        suppliers.body.items.map((item: { id: string }) => item.id).sort(),
        [fixtures.supplierA.id].sort(),
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
    name: "tenant A cannot retrieve tenant B product",
    run: async () => {
      const response = await ownerAAgent.get(
        `/api/v1/catalogue/products/${fixtures.productB.id}`,
      );
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot retrieve tenant B supplier",
    run: async () => {
      const response = await ownerAAgent.get(`/api/v1/suppliers/${fixtures.supplierB.id}`);
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot create supplier against tenant B branch id",
    run: async () => {
      const response = await ownerAAgent.post("/api/v1/suppliers").send({
        branchId: fixtures.branchB1.id,
        legalName: "Cross Tenant Supplier",
        supplierCode: "X-SUP-001",
        countryCode: "GB",
      });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot link supplier to tenant B product",
    run: async () => {
      const response = await ownerAAgent
        .post(`/api/v1/suppliers/${fixtures.supplierA.id}/products`)
        .send({
          productId: fixtures.productB.id,
          supplierUnitId: fixtures.unitB.id,
          supplierSku: "CROSS-TENANT-SKU",
        });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot create product using tenant B references",
    run: async () => {
      const response = await ownerAAgent.post("/api/v1/catalogue/products").send({
        product: {
          categoryId: fixtures.categoryB.id,
          manufacturerId: fixtures.manufacturerB.id,
          primaryUnitId: fixtures.unitB.id,
          name: "Cross Tenant Product",
          slug: "cross-tenant-product",
          sku: "X-TENANT-001",
        },
        initialVariant: {
          name: "Default",
          sku: "X-TENANT-001-DEF",
        },
      });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot update tenant B product",
    run: async () => {
      const response = await ownerAAgent
        .patch(`/api/v1/catalogue/products/${fixtures.productB.id}`)
        .send({ name: "Hacked Product" });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot archive tenant B product",
    run: async () => {
      const response = await ownerAAgent.patch(
        `/api/v1/catalogue/products/${fixtures.productB.id}/archive`,
      ).send({});
      assert.equal(response.status, 404);
    },
  },
  {
    name: "catalogue manage requires explicit permission",
    run: async () => {
      const response = await staffAAgent.post("/api/v1/catalogue/products").send({
        product: {
          categoryId: fixtures.categoryA.id,
          manufacturerId: fixtures.manufacturerA.id,
          primaryUnitId: fixtures.unitA.id,
          name: "Staff Restricted Product",
          slug: "staff-restricted-product",
          sku: "STAFF-001",
        },
        initialVariant: {
          name: "Default",
          sku: "STAFF-001-DEF",
        },
      });
      assert.equal(response.status, 403);
    },
  },
  {
    name: "supplier management requires explicit permission",
    run: async () => {
      const response = await staffAAgent.post("/api/v1/suppliers").send({
        branchId: fixtures.branchA1.id,
        legalName: "Staff Restricted Supplier",
        supplierCode: "STAFF-SUP-001",
        countryCode: "GB",
      });
      assert.equal(response.status, 403);
    },
  },
  {
    name: "supplier pricing view requires explicit permission",
    run: async () => {
      const response = await staffAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-lists`,
      );
      assert.equal(response.status, 403);
    },
  },
  {
    name: "supplier pricing import requires explicit permission",
    run: async () => {
      const response = await staffAAgent
        .post(`/api/v1/suppliers/${fixtures.supplierA.id}/price-imports`)
        .sendFormData(
          buildImportFormData(
            "supplier sku,price basis,currency,base cost,effective date\nSUP-A-CARPET-001,ROLL,GBP,12.5000,2026-07-18\n",
          ),
        );
      assert.equal(response.status, 403);
    },
  },
  {
    name: "tenant A cannot create import for tenant B supplier",
    run: async () => {
      const response = await ownerAAgent
        .post(`/api/v1/suppliers/${fixtures.supplierB.id}/price-imports`)
        .sendFormData(
          buildImportFormData(
            "supplier sku,price basis,currency,base cost,effective date\nSUP-B-LVT-001,PACK,GBP,38.7500,2026-07-18\n",
          ),
        );
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot list tenant B imports",
    run: async () => {
      const created = await ownerBAgent
        .post(`/api/v1/suppliers/${fixtures.supplierB.id}/price-imports`)
        .sendFormData(
          buildImportFormData(
            "supplier sku,price basis,currency,base cost,effective date\nSUP-B-LVT-001,PACK,GBP,38.7500,2026-07-18\n",
          ),
        );
      assert.equal(created.status, 201);

      const response = await ownerAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-imports`,
      );
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot read tenant B import rows",
    run: async () => {
      const created = await createPriceImport(
        ownerBAgent,
        fixtures.supplierB.id,
        "supplier sku,price basis,currency,base cost,effective date\nSUP-B-LVT-001,PACK,GBP,38.7500,2026-07-18\n",
      );

      const response = await ownerAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-imports/${created.id}/rows`,
      );
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot read tenant B import detail",
    run: async () => {
      const created = await createPriceImport(
        ownerBAgent,
        fixtures.supplierB.id,
        "supplier sku,price basis,currency,base cost,effective date\nSUP-B-LVT-001,PACK,GBP,38.7500,2026-07-18\n",
      );

      const response = await ownerAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-imports/${created.id}`,
      );
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot cancel tenant B import",
    run: async () => {
      const created = await createPriceImport(
        ownerBAgent,
        fixtures.supplierB.id,
        "supplier sku,price basis,currency,base cost,effective date\nSUP-B-LVT-001,PACK,GBP,38.7500,2026-07-18\n",
      );

      const response = await ownerAAgent.post(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-imports/${created.id}/cancel`,
      ).send({});
      assert.equal(response.status, 404);
    },
  },
  {
    name: "supplier pricing approval requires explicit permission",
    run: async () => {
      const created = await createPriceImport(ownerAAgent, fixtures.supplierA.id);
      await applyImportMapping(ownerAAgent, fixtures.supplierA.id, created.id);
      const validated = await ownerAAgent.post(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-imports/${created.id}/validate`,
      ).send({});
      assert.equal(validated.status, 201);

      const response = await staffAAgent.post(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-imports/${created.id}/approve`,
      ).send({});
      assert.equal(response.status, 403);
    },
  },
  {
    name: "supplier pricing execution requires explicit permission",
    run: async () => {
      const created = await createPriceImport(ownerAAgent, fixtures.supplierA.id);
      await applyImportMapping(ownerAAgent, fixtures.supplierA.id, created.id);
      const validated = await ownerAAgent.post(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-imports/${created.id}/validate`,
      ).send({});
      assert.equal(validated.status, 201);
      const approved = await ownerAAgent.post(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-imports/${created.id}/approve`,
      ).send({});
      assert.equal(approved.status, 201);

      const response = await staffAAgent.post(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-imports/${created.id}/execute`,
      ).send({});
      assert.equal(response.status, 403);
    },
  },
  {
    name: "tenant A cannot list tenant B saved price import mappings",
    run: async () => {
      const created = await ownerBAgent.post(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-import-mappings`,
      ).send(buildSavedMapping());
      assert.equal(created.status, 201);

      const response = await ownerAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-import-mappings`,
      );
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot update tenant B saved price import mapping",
    run: async () => {
      const created = await ownerBAgent.post(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-import-mappings`,
      ).send(buildSavedMapping());
      assert.equal(created.status, 201);

      const response = await ownerAAgent.patch(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-import-mappings/${created.body.id}`,
      ).send({
        mapping: buildSavedMapping().mapping,
      });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "supplier A cannot use supplier B saved price import mapping id",
    run: async () => {
      const created = await ownerAAgent.post(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-import-mappings`,
      ).send(buildSavedMapping());
      assert.equal(created.status, 404);

      const ownerBCreated = await ownerBAgent.post(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-import-mappings`,
      ).send(buildSavedMapping());
      assert.equal(ownerBCreated.status, 201);

      const response = await ownerAAgent.patch(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-import-mappings/${ownerBCreated.body.id}`,
      ).send({
        mapping: buildSavedMapping().mapping,
      });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot manually match tenant B product into tenant A import row",
    run: async () => {
      const created = await createPriceImport(
        ownerAAgent,
        fixtures.supplierA.id,
        "supplier sku,price basis,currency,base cost,effective date\nUNKNOWN-SKU,ROLL,GBP,12.5000,2026-07-18\n",
      );
      const rows = await getPriceImportRows(ownerAAgent, fixtures.supplierA.id, created.id);

      const response = await ownerAAgent.patch(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-imports/${created.id}/rows/${rows[0]?.id}/match`,
      ).send({
        productId: fixtures.productB.id,
      });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot manually match tenant B variant into tenant A import row",
    run: async () => {
      const created = await createPriceImport(
        ownerAAgent,
        fixtures.supplierA.id,
        "supplier sku,price basis,currency,base cost,effective date\nUNKNOWN-SKU,ROLL,GBP,12.5000,2026-07-18\n",
      );
      const rows = await getPriceImportRows(ownerAAgent, fixtures.supplierA.id, created.id);
      const tenantBVariant = await prisma.productVariant.create({
        data: {
          tenantId: fixtures.tenantB.id,
          productId: fixtures.productB.id,
          unitOfMeasureId: fixtures.unitB.id,
          name: "Tenant B Default Variant",
          sku: "B-LVT-001-DEF",
          isDefault: true,
        },
      });

      const response = await ownerAAgent.patch(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-imports/${created.id}/rows/${rows[0]?.id}/match`,
      ).send({
        variantId: tenantBVariant.id,
      });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "tenant A cannot manually match tenant B supplier product into tenant A import row",
    run: async () => {
      const created = await createPriceImport(
        ownerAAgent,
        fixtures.supplierA.id,
        "supplier sku,price basis,currency,base cost,effective date\nUNKNOWN-SKU,ROLL,GBP,12.5000,2026-07-18\n",
      );
      const rows = await getPriceImportRows(ownerAAgent, fixtures.supplierA.id, created.id);

      const response = await ownerAAgent.patch(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-imports/${created.id}/rows/${rows[0]?.id}/match`,
      ).send({
        supplierProductId: fixtures.supplierProductB.id,
      });
      assert.equal(response.status, 404);
    },
  },
  {
    name: "manual matching rejects a mismatched product and variant relationship",
    run: async () => {
      const created = await createPriceImport(
        ownerAAgent,
        fixtures.supplierA.id,
        "supplier sku,price basis,currency,base cost,effective date\nUNKNOWN-SKU,ROLL,GBP,12.5000,2026-07-18\n",
      );
      const rows = await getPriceImportRows(ownerAAgent, fixtures.supplierA.id, created.id);
      const secondProduct = await prisma.product.create({
        data: {
          tenantId: fixtures.tenantA.id,
          categoryId: fixtures.categoryA.id,
          manufacturerId: fixtures.manufacturerA.id,
          primaryUnitId: fixtures.unitA.id,
          name: "Tenant A Secondary Product",
          slug: "tenant-a-secondary-product",
          sku: "A-CARPET-SECONDARY",
        },
      });
      const secondVariant = await prisma.productVariant.create({
        data: {
          tenantId: fixtures.tenantA.id,
          productId: secondProduct.id,
          unitOfMeasureId: fixtures.unitA.id,
          name: "Secondary Default",
          sku: "A-CARPET-SECONDARY-DEF",
          isDefault: true,
        },
      });

      const response = await ownerAAgent.patch(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-imports/${created.id}/rows/${rows[0]?.id}/match`,
      ).send({
        productId: fixtures.productA.id,
        variantId: secondVariant.id,
      });
      assert.equal(response.status, 400);
    },
  },
  {
    name: "tenant A cannot read tenant B price lists, versions, or price history",
    run: async () => {
      const created = await createPriceImport(
        ownerBAgent,
        fixtures.supplierB.id,
        "supplier sku,price basis,currency,base cost,effective date\nSUP-B-LVT-001,PACK,GBP,38.7500,2026-07-18\n",
      );
      await applyImportMapping(ownerBAgent, fixtures.supplierB.id, created.id);
      const executed = await executeImportLifecycle(
        ownerBAgent,
        fixtures.supplierB.id,
        created.id,
      );

      const priceLists = await ownerAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-lists`,
      );
      assert.equal(priceLists.status, 404);

      const listDetail = await ownerAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-lists/${executed.priceListId}`,
      );
      assert.equal(listDetail.status, 404);

      const versions = await ownerBAgent.get(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-lists/${executed.priceListId}/versions`,
      );
      assert.equal(versions.status, 200);
      const versionId = versions.body[0].id;

      const versionDetail = await ownerAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierB.id}/price-lists/${executed.priceListId}/versions/${versionId}`,
      );
      assert.equal(versionDetail.status, 404);

      const history = await ownerAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierB.id}/products/${fixtures.supplierProductB.id}/price-history`,
      );
      assert.equal(history.status, 404);
    },
  },
  {
    name: "same-tenant pricing import lifecycle creates a version and history",
    run: async () => {
      const created = await createPriceImport(ownerAAgent, fixtures.supplierA.id);
      const mappingResponse = await ownerAAgent.patch(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-imports/${created.id}/mapping`,
      ).send({
        mapping: buildSavedMapping().mapping,
      });
      assert.equal(mappingResponse.status, 200);

      const importDetail = await ownerAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-imports/${created.id}`,
      );
      assert.equal(importDetail.status, 200);

      const executed = await executeImportLifecycle(
        ownerAAgent,
        fixtures.supplierA.id,
        created.id,
      );

      const priceList = await ownerAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-lists/${executed.priceListId}`,
      );
      assert.equal(priceList.status, 200);

      const versions = await ownerAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierA.id}/price-lists/${executed.priceListId}/versions`,
      );
      assert.equal(versions.status, 200);
      assert.equal(versions.body.length, 1);

      const history = await ownerAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierA.id}/products/${fixtures.supplierProductA.id}/price-history`,
      );
      assert.equal(history.status, 200);
      assert.equal(history.body.length, 1);
    },
  },
  {
    name: "user without pricing view permission cannot read raw supplier cost routes",
    run: async () => {
      const productPrices = await staffAAgent.get(
        `/api/v1/catalogue/products/${fixtures.productA.id}/current-supplier-prices`,
      );
      assert.equal(productPrices.status, 403);

      const history = await staffAAgent.get(
        `/api/v1/suppliers/${fixtures.supplierA.id}/products/${fixtures.supplierProductA.id}/price-history`,
      );
      assert.equal(history.status, 403);
    },
  },
  {
    name: "catalogue archive hides products by default",
    run: async () => {
      const archived = await ownerAAgent.patch(
        `/api/v1/catalogue/products/${fixtures.productA.id}/archive`,
      ).send({});
      assert.equal(archived.status, 200);

      const defaultList = await ownerAAgent.get("/api/v1/catalogue/products");
      assert.equal(defaultList.status, 200);
      assert.equal(defaultList.body.items.length, 0);

      const archivedList = await ownerAAgent.get(
        "/api/v1/catalogue/products?includeArchived=true",
      );
      assert.equal(archivedList.status, 200);
      assert.deepEqual(
        archivedList.body.items.map((item: { id: string }) => item.id),
        [fixtures.productA.id],
      );
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
,
  {
    name: "tenant A cannot create requisition using tenant B product",
    run: async () => {
      const response = await ownerAAgent.post("/api/v1/purchase-requisitions").send({
        lines: [
          {
            productId: fixtures.productB.id,
            description: "Test Line",
            requestedQuantity: 10,
            unit: "PACK",
          }
        ]
      });
      assert.equal(response.status, 404);
    }
  },
  {
    name: "tenant A cannot retrieve tenant B requisition",
    run: async () => {
      const reqB = await ownerBAgent.post("/api/v1/purchase-requisitions").send({
        lines: [
          {
            productId: fixtures.productB.id,
            description: "Test",
            requestedQuantity: 1,
            unit: "PACK",
          }
        ]
      });
      assert.equal(reqB.status, 201);
      
      const response = await ownerAAgent.get(`/api/v1/purchase-requisitions/${reqB.body.id}`);
      assert.equal(response.status, 404);
    }
  },
  {
    name: "staff without procurement permissions cannot create requisition",
    run: async () => {
      const response = await staffAAgent.post("/api/v1/purchase-requisitions").send({
        lines: [
          {
            productId: fixtures.productA.id,
            description: "Test",
            requestedQuantity: 1,
            unit: "ROLL",
          }
        ]
      });
      assert.equal(response.status, 403);
    }
  },
  {
    name: "tenant A cannot create purchase order for tenant B supplier",
    run: async () => {
      const response = await ownerAAgent.post("/api/v1/purchase-orders").send({
        supplierId: fixtures.supplierB.id,
        lines: [
          {
            productId: fixtures.productA.id,
            quantity: 1,
          }
        ]
      });
      assert.equal(response.status, 404);
    }
  },
  {
    name: "tenant A cannot retrieve tenant B purchase order",
    run: async () => {
      const poB = await ownerBAgent.post("/api/v1/purchase-orders").send({
        supplierId: fixtures.supplierB.id,
        lines: [
          {
            productId: fixtures.productB.id,
            quantity: 1,
          }
        ]
      });
      assert.equal(poB.status, 201);
      
      const response = await ownerAAgent.get(`/api/v1/purchase-orders/${poB.body.id}`);
      assert.equal(response.status, 404);
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
