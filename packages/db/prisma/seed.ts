import { hashPassword, hashToken } from "@tradesperson/auth";
import { PrismaClient, RoleScope, SubscriptionStatus } from "@prisma/client";

const prisma = new PrismaClient();

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
  ["leads.view", "CRM", "View leads"],
  ["leads.manage", "CRM", "Create and update leads"],
  ["customers.view", "CRM", "View customers"],
  ["customers.manage", "CRM", "Create and update customers"],
  ["properties.view", "CRM", "View properties"],
  ["properties.manage", "CRM", "Create and update properties"],
  ["sites.view", "CRM", "View sites"],
  ["sites.manage", "CRM", "Create and update sites"],
] as const;

const tenantRoles = {
  BUSINESS_OWNER: [
    "settings.manage",
    "branches.manage",
    "branches.view",
    "users.invite",
    "users.view",
    "roles.manage",
    "roles.view",
    "subscriptions.view",
    "audit.view",
    "leads.view",
    "leads.manage",
    "customers.view",
    "customers.manage",
    "properties.view",
    "properties.manage",
    "sites.view",
    "sites.manage",
  ],
  BRANCH_MANAGER: [
    "branches.view",
    "users.view",
    "roles.view",
    "audit.view",
    "leads.view",
    "leads.manage",
    "customers.view",
    "customers.manage",
    "properties.view",
    "properties.manage",
    "sites.view",
    "sites.manage",
  ],
  STAFF: ["branches.view", "leads.view", "customers.view", "properties.view", "sites.view"],
} as const;

async function main() {
  for (const [key, group, description] of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: { group, description },
      create: { key, group, description },
    });
  }

  const permissionRecords = await prisma.permission.findMany();
  const permissionByKey = new Map(
    permissionRecords.map((permission) => [permission.key, permission]),
  );

  const plans = [
    { key: "solo", name: "Solo", description: "Single-user starter plan" },
    {
      key: "starter",
      name: "Starter",
      description: "Small business foundation plan",
    },
    { key: "growth", name: "Growth", description: "Growing team plan" },
  ] as const;

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { key: plan.key },
      update: { name: plan.name, description: plan.description },
      create: plan,
    });
  }

  const features = [
    {
      key: "branches",
      name: "Branches",
      description: "Manage branches and locations",
    },
    {
      key: "user-invitations",
      name: "User Invitations",
      description: "Invite and manage tenant users",
    },
    {
      key: "audit-logs",
      name: "Audit Logs",
      description: "View administrative audit activity",
    },
  ] as const;

  for (const feature of features) {
    await prisma.feature.upsert({
      where: { key: feature.key },
      update: feature,
      create: feature,
    });
  }

  const growthPlan = await prisma.subscriptionPlan.findUniqueOrThrow({
    where: { key: "growth" },
  });
  const featureRecords = await prisma.feature.findMany();

  for (const feature of featureRecords) {
    await prisma.planFeature.upsert({
      where: {
        planId_featureId: { planId: growthPlan.id, featureId: feature.id },
      },
      update: { enabled: true },
      create: { planId: growthPlan.id, featureId: feature.id, enabled: true },
    });
  }

  for (const [key, permissionKeys] of Object.entries(tenantRoles)) {
    const role = await prisma.role.upsert({
      where: { key },
      update: {
        name: key.replaceAll("_", " "),
        scope: RoleScope.TENANT,
        isSystem: true,
        isActive: true,
      },
      create: {
        key,
        name: key.replaceAll("_", " "),
        scope: RoleScope.TENANT,
        isSystem: true,
        isActive: true,
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const permissionKey of permissionKeys) {
      const permission = permissionByKey.get(permissionKey);
      if (!permission) continue;

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const ownerPassword = await hashPassword("Password123!");
  const managerPassword = await hashPassword("Password123!");
  const staffPassword = await hashPassword("Password123!");

  const owner = await prisma.user.upsert({
    where: { email: "owner@exampleflooring.local" },
    update: {
      firstName: "Olivia",
      lastName: "Owner",
      passwordHash: ownerPassword,
      status: "ACTIVE",
    },
    create: {
      email: "owner@exampleflooring.local",
      firstName: "Olivia",
      lastName: "Owner",
      passwordHash: ownerPassword,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@exampleflooring.local" },
    update: {
      firstName: "Marcus",
      lastName: "Manager",
      passwordHash: managerPassword,
      status: "ACTIVE",
    },
    create: {
      email: "manager@exampleflooring.local",
      firstName: "Marcus",
      lastName: "Manager",
      passwordHash: managerPassword,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@exampleflooring.local" },
    update: {
      firstName: "Sofia",
      lastName: "Staff",
      passwordHash: staffPassword,
      status: "ACTIVE",
    },
    create: {
      email: "staff@exampleflooring.local",
      firstName: "Sofia",
      lastName: "Staff",
      passwordHash: staffPassword,
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "example-flooring" },
    update: {
      name: "Example Flooring Ltd",
      legalName: "Example Flooring Ltd",
      tradingName: "Example Flooring",
      businessEmail: "hello@exampleflooring.local",
      businessPhone: "+44 161 555 0100",
      city: "Manchester",
      postcode: "M1 1AA",
    },
    create: {
      name: "Example Flooring Ltd",
      slug: "example-flooring",
      legalName: "Example Flooring Ltd",
      tradingName: "Example Flooring",
      businessEmail: "hello@exampleflooring.local",
      businessPhone: "+44 161 555 0100",
      city: "Manchester",
      postcode: "M1 1AA",
    },
  });

  const headOffice = await prisma.branch.upsert({
    where: {
      tenantId_branchCode: { tenantId: tenant.id, branchCode: "MAN-HQ" },
    },
    update: {
      name: "Manchester Head Office",
      type: "HEAD_OFFICE",
      isDefault: true,
      city: "Manchester",
      postcode: "M1 1AA",
    },
    create: {
      tenantId: tenant.id,
      branchCode: "MAN-HQ",
      name: "Manchester Head Office",
      type: "HEAD_OFFICE",
      isDefault: true,
      city: "Manchester",
      postcode: "M1 1AA",
    },
  });

  await prisma.branch.upsert({
    where: {
      tenantId_branchCode: { tenantId: tenant.id, branchCode: "MAN-SHOW" },
    },
    update: {
      name: "Manchester Showroom",
      type: "SHOWROOM",
      city: "Manchester",
      postcode: "M2 2BB",
    },
    create: {
      tenantId: tenant.id,
      branchCode: "MAN-SHOW",
      name: "Manchester Showroom",
      type: "SHOWROOM",
      city: "Manchester",
      postcode: "M2 2BB",
    },
  });

  await prisma.tenantSetting.upsert({
    where: { tenantId: tenant.id },
    update: {
      quoteNumberPrefix: "QEF",
      invoiceNumberPrefix: "IEF",
      jobNumberPrefix: "JEF",
    },
    create: {
      tenantId: tenant.id,
      quoteNumberPrefix: "QEF",
      invoiceNumberPrefix: "IEF",
      jobNumberPrefix: "JEF",
    },
  });

  for (const [key, prefix] of [
    ["quote", "QEF"],
    ["invoice", "IEF"],
    ["job", "JEF"],
  ] as const) {
    await prisma.numberSequence.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key } },
      update: { prefix, nextValue: 1, padding: 5 },
      create: { tenantId: tenant.id, key, prefix, nextValue: 1, padding: 5 },
    });
  }

  await prisma.tenantSubscription.upsert({
    where: {
      tenantId_planId: { tenantId: tenant.id, planId: growthPlan.id },
    },
    update: {
      status: SubscriptionStatus.ACTIVE,
    },
    create: {
      tenantId: tenant.id,
      planId: growthPlan.id,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  const ownerMembership = await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: owner.id } },
    update: { status: "ACTIVE", isOwner: true, defaultBranchId: headOffice.id },
    create: {
      tenantId: tenant.id,
      userId: owner.id,
      status: "ACTIVE",
      isOwner: true,
      defaultBranchId: headOffice.id,
    },
  });

  const managerMembership = await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: manager.id } },
    update: { status: "ACTIVE", defaultBranchId: headOffice.id },
    create: {
      tenantId: tenant.id,
      userId: manager.id,
      status: "ACTIVE",
      defaultBranchId: headOffice.id,
    },
  });

  const staffMembership = await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: staff.id } },
    update: { status: "ACTIVE", defaultBranchId: headOffice.id },
    create: {
      tenantId: tenant.id,
      userId: staff.id,
      status: "ACTIVE",
      defaultBranchId: headOffice.id,
    },
  });

  const roles = await prisma.role.findMany();
  const roleByKey = new Map(roles.map((role) => [role.key, role]));

  await prisma.membershipRole.deleteMany({
    where: {
      membershipId: {
        in: [ownerMembership.id, managerMembership.id, staffMembership.id],
      },
    },
  });

  for (const [membershipId, roleKey] of [
    [ownerMembership.id, "BUSINESS_OWNER"],
    [managerMembership.id, "BRANCH_MANAGER"],
    [staffMembership.id, "STAFF"],
  ] as const) {
    const role = roleByKey.get(roleKey);
    if (!role) continue;

    await prisma.membershipRole.create({
      data: {
        membershipId,
        roleId: role.id,
      },
    });
  }

  await prisma.invitation.upsert({
    where: { tokenHash: hashToken("demo-pending-invitation") },
    update: {
      tenantId: tenant.id,
      email: "invitee@exampleflooring.local",
      createdById: owner.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    create: {
      tenantId: tenant.id,
      email: "invitee@exampleflooring.local",
      firstName: "Ivy",
      lastName: "Invitee",
      roleKey: "STAFF",
      createdById: owner.id,
      tokenHash: hashToken("demo-pending-invitation"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const demoCustomer = await prisma.customer.upsert({
    where: { id: "ff7c5f7c-b0d8-4b04-8d59-9c5c01c2b901" },
    update: {
      tenantId: tenant.id,
      branchId: headOffice.id,
      customerType: "RESIDENTIAL",
      displayName: "Amelia Johnson",
      primaryEmail: "amelia.johnson@exampleflooring.local",
      primaryPhone: "+44 7700 900100",
      notes: "Returning customer with hallway and lounge refit planned.",
    },
    create: {
      id: "ff7c5f7c-b0d8-4b04-8d59-9c5c01c2b901",
      tenantId: tenant.id,
      branchId: headOffice.id,
      customerType: "RESIDENTIAL",
      displayName: "Amelia Johnson",
      primaryEmail: "amelia.johnson@exampleflooring.local",
      primaryPhone: "+44 7700 900100",
      notes: "Returning customer with hallway and lounge refit planned.",
    },
  });

  await prisma.site.upsert({
    where: { id: "f95ed7a0-b5d7-4717-ae4c-669b26a1e2d2" },
    update: {
      tenantId: tenant.id,
      customerId: demoCustomer.id,
      branchId: headOffice.id,
      siteType: "RESIDENTIAL",
      label: "Johnson Residence",
      addressLine1: "14 Birch Avenue",
      city: "Manchester",
      postcode: "M20 2LT",
      countryCode: "GB",
      accessNotes: "Parking available on driveway.",
    },
    create: {
      id: "f95ed7a0-b5d7-4717-ae4c-669b26a1e2d2",
      tenantId: tenant.id,
      customerId: demoCustomer.id,
      branchId: headOffice.id,
      siteType: "RESIDENTIAL",
      label: "Johnson Residence",
      addressLine1: "14 Birch Avenue",
      city: "Manchester",
      postcode: "M20 2LT",
      countryCode: "GB",
      accessNotes: "Parking available on driveway.",
    },
  });

  await prisma.lead.upsert({
    where: { id: "18e7bacc-56ad-4ce4-98ec-335c49f3fc6a" },
    update: {
      tenantId: tenant.id,
      branchId: headOffice.id,
      status: "QUALIFIED",
      firstName: "Daniel",
      lastName: "Carter",
      email: "daniel.carter@exampleflooring.local",
      phone: "+44 7700 900200",
      source: "Website enquiry",
      notes: "Interested in luxury vinyl tile for kitchen and dining room.",
      addressLine1: "22 Alder Street",
      city: "Manchester",
      postcode: "M4 5PL",
      countryCode: "GB",
    },
    create: {
      id: "18e7bacc-56ad-4ce4-98ec-335c49f3fc6a",
      tenantId: tenant.id,
      branchId: headOffice.id,
      status: "QUALIFIED",
      firstName: "Daniel",
      lastName: "Carter",
      email: "daniel.carter@exampleflooring.local",
      phone: "+44 7700 900200",
      source: "Website enquiry",
      notes: "Interested in luxury vinyl tile for kitchen and dining room.",
      addressLine1: "22 Alder Street",
      city: "Manchester",
      postcode: "M4 5PL",
      countryCode: "GB",
    },
  });

  await prisma.lead.upsert({
    where: { id: "0e4f054d-1f12-4b46-b254-8f46eb7b9a88" },
    update: {
      tenantId: tenant.id,
      branchId: headOffice.id,
      status: "NEW",
      firstName: "Nina",
      lastName: "Patel",
      companyName: "Patel Lettings",
      email: "nina.patel@exampleflooring.local",
      phone: "+44 7700 900300",
      source: "Referral",
      notes: "Needs quote for stair runner replacement in rental property.",
      addressLine1: "3 Market Square",
      city: "Stockport",
      postcode: "SK1 1AA",
      countryCode: "GB",
    },
    create: {
      id: "0e4f054d-1f12-4b46-b254-8f46eb7b9a88",
      tenantId: tenant.id,
      branchId: headOffice.id,
      status: "NEW",
      firstName: "Nina",
      lastName: "Patel",
      companyName: "Patel Lettings",
      email: "nina.patel@exampleflooring.local",
      phone: "+44 7700 900300",
      source: "Referral",
      notes: "Needs quote for stair runner replacement in rental property.",
      addressLine1: "3 Market Square",
      city: "Stockport",
      postcode: "SK1 1AA",
      countryCode: "GB",
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
