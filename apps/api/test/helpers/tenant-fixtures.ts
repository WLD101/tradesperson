import { hashPassword } from "@tradesperson/auth";
import type {
  Branch,
  Customer,
  Invitation,
  Lead,
  Supplier,
  SupplierContact,
  SupplierProduct,
  Permission,
  Product,
  ProductCategory,
  Manufacturer,
  Site,
  Role,
  SubscriptionPlan,
  Tenant,
  TenantMembership,
  UnitOfMeasure,
  User,
} from "@prisma/client";
import { prisma } from "./test-db";

const password = "Password123!";

const permissions = [
  ["settings:manage", "Administration", "Manage tenant business settings"],
  ["branches:manage", "Administration", "Create and edit branches"],
  ["branches:view", "Administration", "View branch details"],
  ["users:invite", "Administration", "Invite tenant users"],
  ["users:view", "Administration", "View tenant users"],
  ["roles:manage", "Administration", "Assign membership roles"],
  ["roles:view", "Administration", "View roles and permissions"],
  ["subscriptions:view", "Administration", "View subscription details"],
  ["audit:view", "Administration", "View audit activity"],
  ["catalogue:view", "Catalogue", "View product catalogue records"],
  ["catalogue:manage", "Catalogue", "Create and update catalogue records"],
  ["catalogue:archive", "Catalogue", "Archive and restore catalogue records"],
  ["suppliers:view", "Suppliers", "View supplier records"],
  ["suppliers:manage", "Suppliers", "Create and update supplier records"],
  ["suppliers:archive", "Suppliers", "Archive and restore supplier records"],
  ["suppliers.contacts:manage", "Suppliers", "Manage supplier contacts"],
  ["suppliers.products:manage", "Suppliers", "Manage supplier product links"],
  ["supplier_pricing:view", "Suppliers", "View supplier pricing records"],
  ["supplier_pricing:manage", "Suppliers", "Create and update supplier pricing records"],
  ["supplier_pricing:approve", "Suppliers", "Approve and activate supplier pricing"],
  ["supplier_pricing:import", "Suppliers", "Run supplier pricing import workflows"],
  ["supplier_pricing:archive", "Suppliers", "Supersede and archive supplier pricing records"],
  ["supplier_pricing.history:view", "Suppliers", "View immutable supplier pricing history"],
  ["procurement:requisition:read", "Procurement", "View purchase requisitions"],
  ["procurement:requisition:create", "Procurement", "Create purchase requisitions"],
  ["procurement:requisition:write", "Procurement", "Manage draft purchase requisitions"],
  ["procurement:requisition:submit", "Procurement", "Submit purchase requisitions"],
  ["procurement:requisition:approve", "Procurement", "Approve and reject purchase requisitions"],
  ["procurement:order:read", "Procurement", "View purchase orders and versions"],
  ["procurement:order:create", "Procurement", "Create purchase orders"],
  ["procurement:order:write", "Procurement", "Manage draft purchase orders and versions"],
  ["procurement:order:submit", "Procurement", "Submit purchase orders for approval"],
  ["procurement:order:approve", "Procurement", "Approve and reject purchase orders"],
  ["procurement:order:issue", "Procurement", "Issue approved purchase orders"],
  ["procurement:order:cancel", "Procurement", "Cancel purchase orders"],
  ["procurement:acknowledgement:write", "Procurement", "Manage supplier acknowledgements"],
  ["procurement:delivery-plan:write", "Procurement", "Manage purchase-order delivery plans"],
  ["procurement:cost:read", "Procurement", "View internal procurement cost data"],
  ["procurement:cost:override", "Procurement", "Override resolved procurement cost with reason"],
  ["procurement:receipt:read", "Procurement", "View goods receipts and inventory movements"],
  ["procurement:receipt:create", "Procurement", "Create purchase-order goods receipts"],
  ["procurement:receipt:post", "Procurement", "Post goods receipts into stock"],
  ["inventory:read", "Inventory", "View stock balances and reconciliation reports"],
  ["inventory:reconcile", "Inventory", "Repair stock balances from immutable inventory movements"],
  ["leads:view", "CRM", "View leads"],
  ["leads:manage", "CRM", "Create and update leads"],
  ["customers:view", "CRM", "View customers"],
  ["customers:manage", "CRM", "Create and update customers"],
  ["properties:view", "CRM", "View properties"],
  ["properties:manage", "CRM", "Create and update properties"],
  ["sites:view", "CRM", "View sites"],
  ["sites:manage", "CRM", "Create and update sites"],
] as const;

export const rolePermissions = {
  BUSINESS_OWNER: permissions.map(([key]) => key),
  BRANCH_MANAGER: [
    "branches:view",
    "users:view",
    "roles:view",
    "audit:view",
    "catalogue:view",
    "catalogue:manage",
    "catalogue:archive",
    "suppliers:view",
    "suppliers:manage",
    "suppliers:archive",
    "suppliers.contacts:manage",
    "suppliers.products:manage",
    "supplier_pricing:view",
    "supplier_pricing:manage",
    "supplier_pricing:approve",
    "supplier_pricing:import",
    "supplier_pricing:archive",
    "supplier_pricing.history:view",
    "procurement:requisition:read",
    "procurement:requisition:create",
    "procurement:requisition:write",
    "procurement:requisition:submit",
    "procurement:requisition:approve",
    "procurement:order:read",
    "procurement:order:create",
    "procurement:order:write",
    "procurement:order:submit",
    "procurement:order:approve",
    "procurement:order:issue",
    "procurement:order:cancel",
    "procurement:acknowledgement:write",
    "procurement:delivery-plan:write",
    "procurement:cost:read",
    "procurement:cost:override",
    "procurement:receipt:read",
    "procurement:receipt:create",
    "procurement:receipt:post",
    "inventory:read",
    "inventory:reconcile",
    "leads:view",
    "leads:manage",
    "customers:view",
    "customers:manage",
    "properties:view",
    "properties:manage",
    "sites:view",
    "sites:manage",
  ],
  STAFF: [
    "branches:view",
    "catalogue:view",
    "suppliers:view",
    "leads:view",
    "customers:view",
    "sites:view",
  ],
  PROCUREMENT_MANAGER: [
    "branches:view",
    "catalogue:view",
    "suppliers:view",
    "supplier_pricing:view",
    "supplier_pricing.history:view",
    "procurement:requisition:read",
    "procurement:requisition:create",
    "procurement:requisition:write",
    "procurement:requisition:submit",
    "procurement:requisition:approve",
    "procurement:order:read",
    "procurement:order:create",
    "procurement:order:write",
    "procurement:order:submit",
    "procurement:order:approve",
    "procurement:order:issue",
    "procurement:order:cancel",
    "procurement:acknowledgement:write",
    "procurement:delivery-plan:write",
    "procurement:cost:read",
    "procurement:cost:override",
    "procurement:receipt:read",
    "procurement:receipt:create",
    "procurement:receipt:post",
    "inventory:read",
    "inventory:reconcile",
  ],
  PROCUREMENT_STAFF: [
    "branches:view",
    "catalogue:view",
    "suppliers:view",
    "supplier_pricing:view",
    "procurement:requisition:read",
    "procurement:requisition:create",
    "procurement:requisition:write",
    "procurement:requisition:submit",
    "procurement:order:read",
    "procurement:order:create",
    "procurement:order:write",
    "procurement:order:submit",
    "procurement:cost:read",
    "procurement:receipt:read",
    "procurement:receipt:create",
    "inventory:read",
  ],
  VIEWER: [
    "branches:view",
    "users:view",
    "roles:view",
    "subscriptions:view",
    "audit:view",
    "catalogue:view",
    "suppliers:view",
    "supplier_pricing:view",
    "supplier_pricing.history:view",
    "procurement:requisition:read",
    "procurement:order:read",
    "procurement:receipt:read",
    "inventory:read",
    "leads:view",
    "customers:view",
    "properties:view",
    "sites:view",
  ],
} as const;

type MembershipWithUser = TenantMembership & { user: User };

export type IsolationFixtureSet = {
  tenantA: Tenant;
  tenantB: Tenant;
  branchA1: Branch;
  branchA2: Branch;
  branchB1: Branch;
  ownerA: MembershipWithUser;
  ownerB: MembershipWithUser;
  branchUserA1: MembershipWithUser;
  staffA: MembershipWithUser;
  customerA1: Customer;
  customerA2: Customer;
  customerB1: Customer;
  siteA1: Site;
  siteA2: Site;
  siteB1: Site;
  leadA1: Lead;
  leadA2: Lead;
  leadB1: Lead;
  categoryA: ProductCategory;
  categoryB: ProductCategory;
  manufacturerA: Manufacturer;
  manufacturerB: Manufacturer;
  unitA: UnitOfMeasure;
  unitB: UnitOfMeasure;
  productA: Product;
  productB: Product;
  supplierA: Supplier;
  supplierB: Supplier;
  supplierContactA: SupplierContact;
  supplierContactB: SupplierContact;
  supplierProductA: SupplierProduct;
  supplierProductB: SupplierProduct;
  invitationA: Invitation;
  invitationB: Invitation;
  subscriptionPlan: SubscriptionPlan;
};

const upsertPermission = async ([key, group, description]: (typeof permissions)[number]) =>
  prisma.permission.upsert({
    where: { key },
    update: { group, description },
    create: { key, group, description },
  });

const assignRolePermissions = async (
  role: Role,
  permissionByKey: Map<string, Permission>,
  keys: readonly string[],
) => {
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  const rolePermissionRows = keys
    .map((key) => permissionByKey.get(key))
    .filter((permission): permission is Permission => Boolean(permission))
    .map((permission) => ({
      roleId: role.id,
      permissionId: permission.id,
    }));

  if (rolePermissionRows.length > 0) {
    await prisma.rolePermission.createMany({
      data: rolePermissionRows,
      skipDuplicates: true,
    });
  }
};

export const createUser = async (input: {
  email: string;
  firstName: string;
  lastName: string;
}) =>
  prisma.user.create({
    data: {
      ...input,
      passwordHash: await hashPassword(password),
    },
  });

export const attachMembershipRole = async (
  membershipId: string,
  role: Role,
) => {
  await prisma.membershipRole.create({
    data: {
      membershipId,
      roleId: role.id,
    },
  });
};

export const createIsolationFixtures = async (): Promise<IsolationFixtureSet> => {
  await Promise.all(permissions.map((permission) => upsertPermission(permission)));
  const permissionRecords = await prisma.permission.findMany();
  const permissionByKey = new Map(
    permissionRecords.map((permission) => [permission.key, permission]),
  );

  const businessOwnerRole = await prisma.role.upsert({
    where: { key: "BUSINESS_OWNER" },
    update: {
      name: "Business Owner",
      scope: "TENANT",
      isSystem: true,
      isActive: true,
    },
    create: {
      key: "BUSINESS_OWNER",
      name: "Business Owner",
      scope: "TENANT",
      isSystem: true,
      isActive: true,
    },
  });
  const branchManagerRole = await prisma.role.upsert({
    where: { key: "BRANCH_MANAGER" },
    update: {
      name: "Branch Manager",
      scope: "TENANT",
      isSystem: true,
      isActive: true,
    },
    create: {
      key: "BRANCH_MANAGER",
      name: "Branch Manager",
      scope: "TENANT",
      isSystem: true,
      isActive: true,
    },
  });
  const staffRole = await prisma.role.upsert({
    where: { key: "STAFF" },
    update: {
      name: "Staff",
      scope: "TENANT",
      isSystem: true,
      isActive: true,
    },
    create: {
      key: "STAFF",
      name: "Staff",
      scope: "TENANT",
      isSystem: true,
      isActive: true,
    },
  });

  await assignRolePermissions(
    businessOwnerRole,
    permissionByKey,
    rolePermissions.BUSINESS_OWNER,
  );
  await assignRolePermissions(
    branchManagerRole,
    permissionByKey,
    rolePermissions.BRANCH_MANAGER,
  );
  await assignRolePermissions(staffRole, permissionByKey, rolePermissions.STAFF);

  const subscriptionPlan = await prisma.subscriptionPlan.upsert({
    where: { key: "growth" },
    update: {
      name: "Growth",
      description: "Growth plan",
    },
    create: {
      key: "growth",
      name: "Growth",
      description: "Growth plan",
    },
  });

  const [tenantA, tenantB] = await Promise.all([
    prisma.tenant.create({
      data: {
        name: "Tenant A Flooring",
        slug: "tenant-a-flooring",
        legalName: "Tenant A Flooring Ltd",
        tradingName: "Tenant A Flooring",
        businessEmail: "a@example.test",
      },
    }),
    prisma.tenant.create({
      data: {
        name: "Tenant B Flooring",
        slug: "tenant-b-flooring",
        legalName: "Tenant B Flooring Ltd",
        tradingName: "Tenant B Flooring",
        businessEmail: "b@example.test",
      },
    }),
  ]);

  await prisma.tenantSetting.createMany({
    data: [
      { tenantId: tenantA.id },
      { tenantId: tenantB.id },
    ],
  });
  await prisma.tenantSubscription.createMany({
    data: [
      { tenantId: tenantA.id, planId: subscriptionPlan.id, status: "ACTIVE" },
      { tenantId: tenantB.id, planId: subscriptionPlan.id, status: "ACTIVE" },
    ],
  });

  const [branchA1, branchA2, branchB1] = await Promise.all([
    prisma.branch.create({
      data: {
        tenantId: tenantA.id,
        branchCode: "A1",
        name: "Tenant A Branch 1",
        type: "HEAD_OFFICE",
        isDefault: true,
        city: "Manchester",
      },
    }),
    prisma.branch.create({
      data: {
        tenantId: tenantA.id,
        branchCode: "A2",
        name: "Tenant A Branch 2",
        type: "SHOWROOM",
        city: "Leeds",
      },
    }),
    prisma.branch.create({
      data: {
        tenantId: tenantB.id,
        branchCode: "B1",
        name: "Tenant B Branch 1",
        type: "HEAD_OFFICE",
        isDefault: true,
        city: "Birmingham",
      },
    }),
  ]);

  const [ownerAUser, ownerBUser, branchUser, staffUser] = await Promise.all([
    createUser({
      email: "owner-a@example.test",
      firstName: "Olivia",
      lastName: "OwnerA",
    }),
    createUser({
      email: "owner-b@example.test",
      firstName: "Ben",
      lastName: "OwnerB",
    }),
    createUser({
      email: "branch-a1@example.test",
      firstName: "Brenda",
      lastName: "Branch",
    }),
    createUser({
      email: "staff-a@example.test",
      firstName: "Sophie",
      lastName: "Staff",
    }),
  ]);

  const ownerA = await prisma.tenantMembership.create({
    data: {
      tenantId: tenantA.id,
      userId: ownerAUser.id,
      status: "ACTIVE",
      isOwner: true,
      defaultBranchId: branchA1.id,
    },
    include: { user: true },
  });
  const ownerB = await prisma.tenantMembership.create({
    data: {
      tenantId: tenantB.id,
      userId: ownerBUser.id,
      status: "ACTIVE",
      isOwner: true,
      defaultBranchId: branchB1.id,
    },
    include: { user: true },
  });
  const branchUserA1 = await prisma.tenantMembership.create({
    data: {
      tenantId: tenantA.id,
      userId: branchUser.id,
      status: "ACTIVE",
      defaultBranchId: branchA1.id,
    },
    include: { user: true },
  });
  const staffA = await prisma.tenantMembership.create({
    data: {
      tenantId: tenantA.id,
      userId: staffUser.id,
      status: "ACTIVE",
      defaultBranchId: branchA1.id,
    },
    include: { user: true },
  });

  await attachMembershipRole(ownerA.id, businessOwnerRole);
  await attachMembershipRole(ownerB.id, businessOwnerRole);
  await attachMembershipRole(branchUserA1.id, branchManagerRole);
  await attachMembershipRole(staffA.id, staffRole);

  const [customerA1, customerA2, customerB1] = await Promise.all([
    prisma.customer.create({
      data: {
        tenantId: tenantA.id,
        branchId: branchA1.id,
        displayName: "Customer A1",
        primaryEmail: "customer-a1@example.test",
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenantA.id,
        branchId: branchA2.id,
        displayName: "Customer A2",
        primaryEmail: "customer-a2@example.test",
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenantB.id,
        branchId: branchB1.id,
        displayName: "Customer B1",
        primaryEmail: "customer-b1@example.test",
      },
    }),
  ]);

  const [siteA1, siteA2, siteB1] = await Promise.all([
    prisma.site.create({
      data: {
        tenantId: tenantA.id,
        customerId: customerA1.id,
        branchId: branchA1.id,
        label: "Site A1",
        city: "Manchester",
      },
    }),
    prisma.site.create({
      data: {
        tenantId: tenantA.id,
        customerId: customerA2.id,
        branchId: branchA2.id,
        label: "Site A2",
        city: "Leeds",
      },
    }),
    prisma.site.create({
      data: {
        tenantId: tenantB.id,
        customerId: customerB1.id,
        branchId: branchB1.id,
        label: "Site B1",
        city: "Birmingham",
      },
    }),
  ]);

  const [leadA1, leadA2, leadB1] = await Promise.all([
    prisma.lead.create({
      data: {
        tenantId: tenantA.id,
        branchId: branchA1.id,
        firstName: "Lead",
        lastName: "A1",
        email: "lead-a1@example.test",
        status: "QUALIFIED",
      },
    }),
    prisma.lead.create({
      data: {
        tenantId: tenantA.id,
        branchId: branchA2.id,
        firstName: "Lead",
        lastName: "A2",
        email: "lead-a2@example.test",
        status: "NEW",
      },
    }),
    prisma.lead.create({
      data: {
        tenantId: tenantB.id,
        branchId: branchB1.id,
        firstName: "Lead",
        lastName: "B1",
        email: "lead-b1@example.test",
        status: "NEW",
      },
    }),
  ]);

  const [categoryA, categoryB] = await Promise.all([
    prisma.productCategory.create({
      data: {
        tenantId: tenantA.id,
        name: "Carpet",
        slug: "carpet",
      },
    }),
    prisma.productCategory.create({
      data: {
        tenantId: tenantB.id,
        name: "LVT",
        slug: "lvt",
      },
    }),
  ]);

  const [manufacturerA, manufacturerB] = await Promise.all([
    prisma.manufacturer.create({
      data: {
        tenantId: tenantA.id,
        name: "Tenant A Mills",
        slug: "tenant-a-mills",
      },
    }),
    prisma.manufacturer.create({
      data: {
        tenantId: tenantB.id,
        name: "Tenant B Mills",
        slug: "tenant-b-mills",
      },
    }),
  ]);

  const [unitA, unitB] = await Promise.all([
    prisma.unitOfMeasure.create({
      data: {
        tenantId: tenantA.id,
        code: "ROLL",
        name: "Roll",
        kind: "ROLL",
      },
    }),
    prisma.unitOfMeasure.create({
      data: {
        tenantId: tenantB.id,
        code: "PACK",
        name: "Pack",
        kind: "PACK",
      },
    }),
  ]);

  const [productA, productB] = await Promise.all([
    prisma.product.create({
      data: {
        tenantId: tenantA.id,
        categoryId: categoryA.id,
        manufacturerId: manufacturerA.id,
        primaryUnitId: unitA.id,
        name: "Tenant A Carpet",
        slug: "tenant-a-carpet",
        sku: "A-CARPET-001",
      },
    }),
    prisma.product.create({
      data: {
        tenantId: tenantB.id,
        categoryId: categoryB.id,
        manufacturerId: manufacturerB.id,
        primaryUnitId: unitB.id,
        name: "Tenant B LVT",
        slug: "tenant-b-lvt",
        sku: "B-LVT-001",
      },
    }),
  ]);

  const [supplierA, supplierB] = await Promise.all([
    prisma.supplier.create({
      data: {
        tenantId: tenantA.id,
        branchId: branchA1.id,
        legalName: "Supplier A Ltd",
        tradingName: "Supplier A",
        supplierCode: "SUP-A-001",
        email: "supplier-a@example.test",
        telephone: "01611234567",
        countryCode: "GB",
        defaultCurrency: "GBP",
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId: tenantB.id,
        branchId: branchB1.id,
        legalName: "Supplier B Ltd",
        tradingName: "Supplier B",
        supplierCode: "SUP-B-001",
        email: "supplier-b@example.test",
        telephone: "01219876543",
        countryCode: "GB",
        defaultCurrency: "GBP",
      },
    }),
  ]);

  const [supplierContactA, supplierContactB] = await Promise.all([
    prisma.supplierContact.create({
      data: {
        tenantId: tenantA.id,
        supplierId: supplierA.id,
        branchId: branchA1.id,
        name: "Alice Buyer",
        email: "alice.buyer@example.test",
        isPrimary: true,
      },
    }),
    prisma.supplierContact.create({
      data: {
        tenantId: tenantB.id,
        supplierId: supplierB.id,
        branchId: branchB1.id,
        name: "Bob Vendor",
        email: "bob.vendor@example.test",
        isPrimary: true,
      },
    }),
  ]);

  const [supplierProductA, supplierProductB] = await Promise.all([
    prisma.supplierProduct.create({
      data: {
        tenantId: tenantA.id,
        supplierId: supplierA.id,
        productId: productA.id,
        supplierUnitId: unitA.id,
        supplierSku: "SUP-A-CARPET-001",
        leadTimeDays: 3,
        preferredSupplier: true,
      },
    }),
    prisma.supplierProduct.create({
      data: {
        tenantId: tenantB.id,
        supplierId: supplierB.id,
        productId: productB.id,
        supplierUnitId: unitB.id,
        supplierSku: "SUP-B-LVT-001",
        leadTimeDays: 5,
        preferredSupplier: true,
      },
    }),
  ]);

  const [invitationA, invitationB] = await Promise.all([
    prisma.invitation.create({
      data: {
        tenantId: tenantA.id,
        email: "invite-a@example.test",
        roleKey: "STAFF",
        tokenHash: "token-a",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
        createdById: ownerA.userId,
      },
    }),
    prisma.invitation.create({
      data: {
        tenantId: tenantB.id,
        email: "invite-b@example.test",
        roleKey: "STAFF",
        tokenHash: "token-b",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
        createdById: ownerB.userId,
      },
    }),
  ]);

  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenantA.id,
        actorUserId: ownerA.userId,
        action: "fixture:create",
        entityType: "lead",
        entityId: leadA1.id,
      },
      {
        tenantId: tenantB.id,
        actorUserId: ownerB.userId,
        action: "fixture:create",
        entityType: "lead",
        entityId: leadB1.id,
      },
    ],
  });

  return {
    tenantA,
    tenantB,
    branchA1,
    branchA2,
    branchB1,
    ownerA,
    ownerB,
    branchUserA1,
    staffA,
    customerA1,
    customerA2,
    customerB1,
    siteA1,
    siteA2,
    siteB1,
    leadA1,
    leadA2,
    leadB1,
    categoryA,
    categoryB,
    manufacturerA,
    manufacturerB,
    unitA,
    unitB,
    productA,
    productB,
    supplierA,
    supplierB,
    supplierContactA,
    supplierContactB,
    supplierProductA,
    supplierProductB,
    invitationA,
    invitationB,
    subscriptionPlan,
  };
};

export const signInThroughApi = async (
  agent: any,
  email: string,
  rawPassword = password,
) => {
  const response = await agent.post("/api/v1/auth/sign-in").send({
    email,
    password: rawPassword,
  });

  if (response.status !== 201) {
    throw new Error(
      `Failed to sign in ${email}: ${response.status} ${JSON.stringify(response.rawBody)}`,
    );
  }

  return response.body as {
    activeTenantId: string | null;
    activeBranchId: string | null;
  };
};



