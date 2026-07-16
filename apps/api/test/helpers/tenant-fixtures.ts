import { hashPassword } from "@tradesperson/auth";
import type {
  Branch,
  Customer,
  Invitation,
  Lead,
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
  ["settings.manage", "Administration", "Manage tenant business settings"],
  ["branches.manage", "Administration", "Create and edit branches"],
  ["branches.view", "Administration", "View branch details"],
  ["users.invite", "Administration", "Invite tenant users"],
  ["users.view", "Administration", "View tenant users"],
  ["roles.manage", "Administration", "Assign membership roles"],
  ["roles.view", "Administration", "View roles and permissions"],
  ["subscriptions.view", "Administration", "View subscription details"],
  ["audit.view", "Administration", "View audit activity"],
  ["catalogue.view", "Catalogue", "View product catalogue records"],
  ["catalogue.manage", "Catalogue", "Create and update catalogue records"],
  ["catalogue.archive", "Catalogue", "Archive and restore catalogue records"],
  ["leads.view", "CRM", "View leads"],
  ["leads.manage", "CRM", "Create and update leads"],
  ["customers.view", "CRM", "View customers"],
  ["customers.manage", "CRM", "Create and update customers"],
  ["properties.view", "CRM", "View properties"],
  ["properties.manage", "CRM", "Create and update properties"],
  ["sites.view", "CRM", "View sites"],
  ["sites.manage", "CRM", "Create and update sites"],
] as const;

const rolePermissions = {
  BUSINESS_OWNER: permissions.map(([key]) => key),
  BRANCH_MANAGER: [
    "branches.view",
    "users.view",
    "roles.view",
    "audit.view",
    "catalogue.view",
    "catalogue.manage",
    "catalogue.archive",
    "leads.view",
    "leads.manage",
    "customers.view",
    "customers.manage",
    "properties.view",
    "properties.manage",
    "sites.view",
    "sites.manage",
  ],
  STAFF: ["branches.view", "catalogue.view", "leads.view", "customers.view", "sites.view"],
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
  for (const key of keys) {
    const permission = permissionByKey.get(key);
    if (!permission) {
      continue;
    }

    await prisma.rolePermission.create({
      data: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });
  }
};

const createUser = async (input: {
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

const attachMembershipRole = async (
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

  const subscriptionPlan = await prisma.subscriptionPlan.create({
    data: {
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
        action: "fixture.create",
        entityType: "lead",
        entityId: leadA1.id,
      },
      {
        tenantId: tenantB.id,
        actorUserId: ownerB.userId,
        action: "fixture.create",
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
