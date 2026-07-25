import { hashPassword, hashToken } from "@tradesperson/auth";
import { EstimateLineType, Prisma, PrismaClient, RoleScope, SubscriptionStatus } from "@prisma/client";
import { parse } from "papaparse";
import { readFileSync } from "fs";
import { join } from "path";
import { seedProcurement } from "./seed-procurement";

const prisma = new PrismaClient();

const estimatePermissionKeys = [
  "estimate:read",
  "estimate:create",
  "estimate:write",
  "estimate:calculate",
  "estimate:approve",
  "estimate:cost:read",
  "estimate:cost:override",
] as const;

const quotePermissionKeys = [
  "quote:read",
  "quote:create",
  "quote:write",
  "quote:send",
  "quote:approve",
  "quote:convert",
] as const;

const jobPermissionKeys = ["job:read", "job:create", "job:write"] as const;

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
  ["catalogue:import", "Catalogue", "Run future catalogue import workflows"],
  [
    "catalogue.documents:manage",
    "Catalogue",
    "Manage catalogue document and image metadata",
  ],
  ["suppliers:view", "Suppliers", "View supplier records and supplier links"],
  ["suppliers:manage", "Suppliers", "Create and update supplier records"],
  ["suppliers:archive", "Suppliers", "Archive and restore suppliers"],
  [
    "suppliers.contacts:manage",
    "Suppliers",
    "Create and update supplier contacts",
  ],
  [
    "suppliers.products:manage",
    "Suppliers",
    "Create and update supplier product links",
  ],
  ["supplier_pricing:view", "Suppliers", "View supplier pricing records"],
  [
    "supplier_pricing:manage",
    "Suppliers",
    "Create and update supplier pricing records",
  ],
  [
    "supplier_pricing:approve",
    "Suppliers",
    "Approve and activate supplier pricing",
  ],
  [
    "supplier_pricing:import",
    "Suppliers",
    "Run supplier pricing import workflows",
  ],
  [
    "supplier_pricing:archive",
    "Suppliers",
    "Supersede and archive supplier pricing records",
  ],
  [
    "supplier_pricing.history:view",
    "Suppliers",
    "View immutable supplier pricing history",
  ],
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
  ["estimate:read", "Estimates", "View estimates and estimate versions"],
  ["estimate:create", "Estimates", "Create estimates from surveys and customer sites"],
  ["estimate:write", "Estimates", "Manage draft and calculated estimates"],
  ["estimate:calculate", "Estimates", "Recalculate estimate pricing and margins"],
  ["estimate:approve", "Estimates", "Mark estimates ready for quote"],
  ["estimate:cost:read", "Estimates", "View internal estimate cost and margin data"],
  ["estimate:cost:override", "Estimates", "Override resolved estimate costs with reason"],
  ["quote:read", "Quotes", "View customer quotes"],
  ["quote:create", "Quotes", "Create customer quotes from estimates"],
  ["quote:write", "Quotes", "Manage draft customer quotes"],
  ["quote:send", "Quotes", "Mark quotes as sent to customers"],
  ["quote:approve", "Quotes", "Approve or reject customer quotes"],
  ["quote:convert", "Quotes", "Convert approved quotes to jobs"],
  ["job:read", "Jobs", "View converted jobs"],
  ["job:create", "Jobs", "Create jobs from approved quotes"],
  ["job:write", "Jobs", "Manage draft and scheduled jobs"],
  ["leads:view", "CRM", "View leads"],
  ["leads:manage", "CRM", "Create and update leads"],
  ["customers:view", "CRM", "View customers"],
  ["customers:manage", "CRM", "Create and update customers"],
  ["properties:view", "CRM", "View properties"],
  ["properties:manage", "CRM", "Create and update properties"],
  ["sites:view", "CRM", "View sites"],
  ["sites:manage", "CRM", "Create and update sites"],
] as const;

const tenantRoles = {
  BUSINESS_OWNER: [
    "settings:manage",
    "branches:manage",
    "branches:view",
    "users:invite",
    "users:view",
    "roles:manage",
    "roles:view",
    "subscriptions:view",
    "audit:view",
    "catalogue:view",
    "catalogue:manage",
    "catalogue:archive",
    "catalogue:import",
    "catalogue.documents:manage",
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
    ...estimatePermissionKeys,
    ...quotePermissionKeys,
    ...jobPermissionKeys,
    "leads:view",
    "leads:manage",
    "customers:view",
    "customers:manage",
    "properties:view",
    "properties:manage",
    "sites:view",
    "sites:manage",
  ],
  BRANCH_MANAGER: [
    "branches:view",
    "users:view",
    "roles:view",
    "audit:view",
    "catalogue:view",
    "catalogue:manage",
    "catalogue:archive",
    "catalogue:import",
    "catalogue.documents:manage",
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
    ...estimatePermissionKeys,
    ...quotePermissionKeys,
    ...jobPermissionKeys,
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
    "estimate:read",
    "quote:read",
    "job:read",
    "leads:view",
    "customers:view",
    "properties:view",
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
    ...estimatePermissionKeys,
    ...quotePermissionKeys,
    ...jobPermissionKeys,
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
    "estimate:read",
    "estimate:create",
    "estimate:write",
    "estimate:calculate",
    "estimate:cost:read",
    "quote:read",
    "quote:create",
    "quote:write",
    "quote:send",
    "job:read",
    "job:create",
    "job:write",
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
    "estimate:read",
    "quote:read",
    "job:read",
    "leads:view",
    "customers:view",
    "properties:view",
    "sites:view",
  ],
} as const;

function getRequiredMapValue<T>(map: Map<string, T>, key: string, label: string) {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Missing ${label}: ${key}`);
  }

  return value;
}

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
      quoteNumberPrefix: "QUO",
      invoiceNumberPrefix: "IEF",
      jobNumberPrefix: "JOB",
    },
    create: {
      tenantId: tenant.id,
      quoteNumberPrefix: "QUO",
      invoiceNumberPrefix: "IEF",
      jobNumberPrefix: "JOB",
    },
  });

  for (const [key, prefix] of [
    ["estimate", "EST"],
    ["quote", "QUO"],
    ["invoice", "IEF"],
    ["job", "JOB"],
  ] as const) {
    await prisma.numberSequence.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key } },
      update: { prefix, nextValue: 1, padding: 6 },
      create: { tenantId: tenant.id, key, prefix, nextValue: 1, padding: 6 },
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

  const demoSite = await prisma.site.upsert({
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

  const categoryDefinitions: Array<{ slug: string; name: string }> = [
    { slug: "carpet", name: "Carpet" },
    { slug: "lvt", name: "Luxury Vinyl Tile" },
    { slug: "sheet-vinyl", name: "Sheet Vinyl" },
    { slug: "laminate", name: "Laminate" },
    { slug: "underlay", name: "Underlay" },
    { slug: "adhesive", name: "Adhesive" },
    { slug: "smoothing-compound", name: "Smoothing Compound" },
    { slug: "door-profile", name: "Door Profile" },
  ];

  const categoryRecords = await Promise.all(
    categoryDefinitions.map(({ slug, name }, index) =>
      prisma.productCategory.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug } },
        update: {
          name,
          sortOrder: index,
          createdById: owner.id,
          updatedById: owner.id,
        },
        create: {
          tenantId: tenant.id,
          slug,
          name,
          sortOrder: index,
          createdById: owner.id,
          updatedById: owner.id,
        },
      }),
    ),
  );

  const categoryBySlug = new Map(categoryRecords.map((item) => [item.slug, item]));

  const manufacturerRecords = await Promise.all(
    [
      { slug: "northshore-surfaces", name: "Northshore Surfaces" },
      { slug: "harbour-line-floors", name: "Harbour Line Floors" },
      { slug: "meadowcraft-materials", name: "Meadowcraft Materials" },
    ].map(({ slug, name }) =>
      prisma.manufacturer.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug } },
        update: {
          name,
          createdById: owner.id,
          updatedById: owner.id,
        },
        create: {
          tenantId: tenant.id,
          slug,
          name,
          createdById: owner.id,
          updatedById: owner.id,
        },
      }),
    ),
  );

  const manufacturerBySlug = new Map(
    manufacturerRecords.map((item) => [item.slug, item]),
  );

  const brandRecords = await Promise.all(
    [
      {
        slug: "softgrain-home",
        name: "Softgrain Home",
        manufacturerSlug: "northshore-surfaces",
      },
      {
        slug: "stoneveil-lvt",
        name: "Stoneveil LVT",
        manufacturerSlug: "harbour-line-floors",
      },
      {
        slug: "ridgeway-contract",
        name: "Ridgeway Contract",
        manufacturerSlug: "harbour-line-floors",
      },
      {
        slug: "quietstep",
        name: "QuietStep",
        manufacturerSlug: "meadowcraft-materials",
      },
    ].map(({ slug, name, manufacturerSlug }) =>
      prisma.brand.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug } },
        update: {
          name,
          manufacturerId: manufacturerBySlug.get(manufacturerSlug)?.id ?? null,
          createdById: owner.id,
          updatedById: owner.id,
        },
        create: {
          tenantId: tenant.id,
          slug,
          name,
          manufacturerId: manufacturerBySlug.get(manufacturerSlug)?.id ?? null,
          createdById: owner.id,
          updatedById: owner.id,
        },
      }),
    ),
  );

  const brandBySlug = new Map(brandRecords.map((item) => [item.slug, item]));

  const collectionRecords = await Promise.all(
    [
      {
        slug: "heather-lane",
        name: "Heather Lane",
        manufacturerSlug: "northshore-surfaces",
        brandSlug: "softgrain-home",
      },
      {
        slug: "granite-bay",
        name: "Granite Bay",
        manufacturerSlug: "harbour-line-floors",
        brandSlug: "stoneveil-lvt",
      },
      {
        slug: "metroshield",
        name: "MetroShield",
        manufacturerSlug: "harbour-line-floors",
        brandSlug: "ridgeway-contract",
      },
      {
        slug: "cloudstep",
        name: "CloudStep",
        manufacturerSlug: "meadowcraft-materials",
        brandSlug: "quietstep",
      },
    ].map(({ slug, name, manufacturerSlug, brandSlug }) =>
      prisma.productCollection.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug } },
        update: {
          name,
          manufacturerId: manufacturerBySlug.get(manufacturerSlug)?.id ?? null,
          brandId: brandBySlug.get(brandSlug)?.id ?? null,
          createdById: owner.id,
          updatedById: owner.id,
        },
        create: {
          tenantId: tenant.id,
          slug,
          name,
          manufacturerId: manufacturerBySlug.get(manufacturerSlug)?.id ?? null,
          brandId: brandBySlug.get(brandSlug)?.id ?? null,
          createdById: owner.id,
          updatedById: owner.id,
        },
      }),
    ),
  );

  const collectionBySlug = new Map(collectionRecords.map((item) => [item.slug, item]));

  const unitRecords = await Promise.all(
    [
      { code: "ROLL", name: "Roll", symbol: "roll", kind: "ROLL" as const },
      { code: "PACK", name: "Pack", symbol: "pack", kind: "PACK" as const },
      { code: "SQM", name: "Square metre", symbol: "m2", kind: "SQM" as const },
      { code: "BAG", name: "Bag", symbol: "bag", kind: "BAG" as const },
      { code: "TUB", name: "Tub", symbol: "tub", kind: "TUB" as const },
      { code: "LM", name: "Linear metre", symbol: "lm", kind: "LM" as const },
    ].map(({ code, name, symbol, kind }) =>
      prisma.unitOfMeasure.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code } },
        update: {
          name,
          symbol,
          kind: kind as any,
          createdById: owner.id,
          updatedById: owner.id,
        },
        create: {
          tenantId: tenant.id,
          code,
          name,
          symbol,
          kind: kind as any,
          createdById: owner.id,
          updatedById: owner.id,
        },
      }),
    ),
  );

  const unitByCode = new Map(unitRecords.map((item) => [item.code, item]));

  type SeedVariantDefinition = {
    sku: string;
    name: string;
    rollWidthM?: number;
    standardRollLengthM?: number;
    thicknessMm?: number;
    wearLayerMm?: number;
    tileLengthMm?: number;
    tileWidthMm?: number;
    packQuantity?: number;
    packCoverageM2?: number;
    isDefault: boolean;
  };

  type SeedProductDefinition = {
    slug: string;
    sku: string;
    name: string;
    categorySlug: string;
    manufacturerSlug: string;
    brandSlug: string;
    collectionSlug: string;
    unitCode: string;
    description: string;
    material?: string;
    colour?: string;
    shade?: string;
    pattern?: string;
    fireRating?: string;
    slipRating?: string;
    acousticRating?: string;
    underfloorHeatingCompatible?: boolean;
    domesticCommercialClass?: string;
    warranty?: string;
    recommendedAdhesive?: string;
    recommendedUnderlay?: string;
    technicalData?: string;
    safetyData?: string;
    initialVariant: SeedVariantDefinition;
  };

  const productDefinitions: SeedProductDefinition[] = [
    {
      slug: "heather-loop-carpet",
      sku: "CARP-HEA-001",
      name: "Heather Loop Carpet",
      categorySlug: "carpet",
      manufacturerSlug: "northshore-surfaces",
      brandSlug: "softgrain-home",
      collectionSlug: "heather-lane",
      unitCode: "ROLL",
      description: "Soft domestic loop carpet for lounge and bedroom refits.",
      material: "Polypropylene",
      colour: "Moorland Grey",
      shade: "Mid grey",
      pattern: "Loop",
      fireRating: "Cfl-s1",
      domesticCommercialClass: "Domestic medium",
      warranty: "12 years",
      recommendedUnderlay: "QuietStep 10mm",
      recommendedAdhesive: "Stretch-fit over gripper",
      initialVariant: {
        sku: "CARP-HEA-001-4M",
        name: "4m roll",
        rollWidthM: 4,
        standardRollLengthM: 30,
        thicknessMm: 9,
        isDefault: true,
      },
    },
    {
      slug: "granite-click-lvt",
      sku: "LVT-GRA-010",
      name: "Granite Click LVT",
      categorySlug: "lvt",
      manufacturerSlug: "harbour-line-floors",
      brandSlug: "stoneveil-lvt",
      collectionSlug: "granite-bay",
      unitCode: "PACK",
      description: "Rigid-core click LVT for kitchen and hallway projects.",
      material: "Rigid core vinyl",
      colour: "Ash Stone",
      shade: "Cool grey",
      pattern: "Stone tile",
      slipRating: "R10",
      underfloorHeatingCompatible: true,
      warranty: "20 years residential",
      recommendedAdhesive: "Not required",
      initialVariant: {
        sku: "LVT-GRA-010-BOX",
        name: "2.12m2 pack",
        packQuantity: 10,
        packCoverageM2: 2.12,
        tileLengthMm: 610,
        tileWidthMm: 305,
        wearLayerMm: 0.55,
        thicknessMm: 5,
        isDefault: true,
      },
    },
    {
      slug: "metro-safe-sheet-vinyl",
      sku: "VIN-MET-020",
      name: "Metro Safe Sheet Vinyl",
      categorySlug: "sheet-vinyl",
      manufacturerSlug: "harbour-line-floors",
      brandSlug: "ridgeway-contract",
      collectionSlug: "metroshield",
      unitCode: "ROLL",
      description: "Commercial safety flooring for wet rooms and circulation areas.",
      material: "Safety vinyl",
      colour: "Quartz Blue",
      slipRating: "R11",
      fireRating: "Bfl-s1",
      acousticRating: "14 dB",
      underfloorHeatingCompatible: true,
      recommendedAdhesive: "HT wet-set adhesive",
      initialVariant: {
        sku: "VIN-MET-020-2M",
        name: "2m roll",
        rollWidthM: 2,
        standardRollLengthM: 20,
        thicknessMm: 2.5,
        wearLayerMm: 0.7,
        isDefault: true,
      },
    },
    {
      slug: "oakcrest-laminate",
      sku: "LAM-OAK-110",
      name: "Oakcrest Laminate",
      categorySlug: "laminate",
      manufacturerSlug: "northshore-surfaces",
      brandSlug: "softgrain-home",
      collectionSlug: "heather-lane",
      unitCode: "PACK",
      description: "Bevel-edged laminate plank for light commercial and domestic rooms.",
      material: "Laminate",
      colour: "Natural Oak",
      pattern: "Wood plank",
      underfloorHeatingCompatible: true,
      warranty: "15 years",
      recommendedUnderlay: "QuietStep 5mm",
      initialVariant: {
        sku: "LAM-OAK-110-PK",
        name: "1.92m2 pack",
        packQuantity: 8,
        packCoverageM2: 1.92,
        tileLengthMm: 1285,
        tileWidthMm: 192,
        thicknessMm: 8,
        isDefault: true,
      },
    },
    {
      slug: "cloudstep-underlay",
      sku: "UND-CLO-050",
      name: "CloudStep Underlay",
      categorySlug: "underlay",
      manufacturerSlug: "meadowcraft-materials",
      brandSlug: "quietstep",
      collectionSlug: "cloudstep",
      unitCode: "ROLL",
      description: "PU underlay for stretch-fit carpet installations.",
      material: "PU foam",
      acousticRating: "28 dB",
      initialVariant: {
        sku: "UND-CLO-050-11MM",
        name: "11mm roll",
        rollWidthM: 1.37,
        standardRollLengthM: 11,
        thicknessMm: 11,
        isDefault: true,
      },
    },
    {
      slug: "bondflex-adhesive",
      sku: "ADH-BON-200",
      name: "BondFlex Adhesive",
      categorySlug: "adhesive",
      manufacturerSlug: "meadowcraft-materials",
      brandSlug: "quietstep",
      collectionSlug: "cloudstep",
      unitCode: "TUB",
      description: "Pressure-sensitive adhesive for LVT plank and tile installs.",
      material: "Acrylic adhesive",
      technicalData: "Open time 20 minutes",
      safetyData: "Use with suitable ventilation",
      initialVariant: {
        sku: "ADH-BON-200-15KG",
        name: "15kg tub",
        packQuantity: 1,
        isDefault: true,
      },
    },
    {
      slug: "smoothbase-compound",
      sku: "SMO-BAS-320",
      name: "SmoothBase Compound",
      categorySlug: "smoothing-compound",
      manufacturerSlug: "meadowcraft-materials",
      brandSlug: "quietstep",
      collectionSlug: "cloudstep",
      unitCode: "BAG",
      description: "Rapid-setting smoothing compound for resilient floor prep.",
      material: "Cementitious smoothing compound",
      technicalData: "Walk-on in 2 hours",
      safetyData: "Dust mask recommended during mixing",
      initialVariant: {
        sku: "SMO-BAS-320-20KG",
        name: "20kg bag",
        packQuantity: 1,
        isDefault: true,
      },
    },
    {
      slug: "edgeform-door-profile",
      sku: "PRO-EDG-410",
      name: "EdgeForm Door Profile",
      categorySlug: "door-profile",
      manufacturerSlug: "northshore-surfaces",
      brandSlug: "softgrain-home",
      collectionSlug: "heather-lane",
      unitCode: "LM",
      description: "Anodised threshold profile for carpet-to-LVT transitions.",
      material: "Aluminium",
      initialVariant: {
        sku: "PRO-EDG-410-09",
        name: "0.9m length",
        tileLengthMm: 900,
        isDefault: true,
      },
    },
  ];

  for (const definition of productDefinitions) {
    const category = getRequiredMapValue(
      categoryBySlug,
      definition.categorySlug,
      "category",
    );
    const primaryUnit = getRequiredMapValue(
      unitByCode,
      definition.unitCode,
      "unit",
    );
    const product = await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: definition.slug } },
      update: {
        categoryId: category.id,
        manufacturerId: manufacturerBySlug.get(definition.manufacturerSlug)?.id ?? null,
        brandId: brandBySlug.get(definition.brandSlug)?.id ?? null,
        collectionId: collectionBySlug.get(definition.collectionSlug)?.id ?? null,
        primaryUnitId: primaryUnit.id,
        name: definition.name,
        sku: definition.sku,
        description: definition.description,
        material: definition.material ?? null,
        colour: definition.colour ?? null,
        shade: definition.shade ?? null,
        pattern: definition.pattern ?? null,
        fireRating: definition.fireRating ?? null,
        slipRating: definition.slipRating ?? null,
        acousticRating: definition.acousticRating ?? null,
        underfloorHeatingCompatible:
          definition.underfloorHeatingCompatible ?? null,
        domesticCommercialClass:
          definition.domesticCommercialClass ?? null,
        warranty: definition.warranty ?? null,
        recommendedAdhesive: definition.recommendedAdhesive ?? null,
        recommendedUnderlay: definition.recommendedUnderlay ?? null,
        technicalData: definition.technicalData ?? null,
        safetyData: definition.safetyData ?? null,
        createdById: owner.id,
        updatedById: owner.id,
      },
      create: {
        tenantId: tenant.id,
        categoryId: category.id,
        manufacturerId: manufacturerBySlug.get(definition.manufacturerSlug)?.id ?? null,
        brandId: brandBySlug.get(definition.brandSlug)?.id ?? null,
        collectionId: collectionBySlug.get(definition.collectionSlug)?.id ?? null,
        primaryUnitId: primaryUnit.id,
        slug: definition.slug,
        name: definition.name,
        sku: definition.sku,
        description: definition.description,
        material: definition.material ?? null,
        colour: definition.colour ?? null,
        shade: definition.shade ?? null,
        pattern: definition.pattern ?? null,
        fireRating: definition.fireRating ?? null,
        slipRating: definition.slipRating ?? null,
        acousticRating: definition.acousticRating ?? null,
        underfloorHeatingCompatible:
          definition.underfloorHeatingCompatible ?? null,
        domesticCommercialClass:
          definition.domesticCommercialClass ?? null,
        warranty: definition.warranty ?? null,
        recommendedAdhesive: definition.recommendedAdhesive ?? null,
        recommendedUnderlay: definition.recommendedUnderlay ?? null,
        technicalData: definition.technicalData ?? null,
        safetyData: definition.safetyData ?? null,
        createdById: owner.id,
        updatedById: owner.id,
      },
    });

    await prisma.productVariant.upsert({
      where: {
        tenantId_sku: {
          tenantId: tenant.id,
          sku: definition.initialVariant.sku,
        },
      },
      update: {
        productId: product.id,
        unitOfMeasureId: primaryUnit.id,
        name: definition.initialVariant.name,
        rollWidthM: definition.initialVariant.rollWidthM ?? null,
        standardRollLengthM:
          definition.initialVariant.standardRollLengthM ?? null,
        thicknessMm: definition.initialVariant.thicknessMm ?? null,
        wearLayerMm: definition.initialVariant.wearLayerMm ?? null,
        tileLengthMm: definition.initialVariant.tileLengthMm ?? null,
        tileWidthMm: definition.initialVariant.tileWidthMm ?? null,
        packQuantity: definition.initialVariant.packQuantity ?? null,
        packCoverageM2: definition.initialVariant.packCoverageM2 ?? null,
        isDefault: true,
        createdById: owner.id,
        updatedById: owner.id,
      },
      create: {
        tenantId: tenant.id,
        productId: product.id,
        unitOfMeasureId: primaryUnit.id,
        sku: definition.initialVariant.sku,
        name: definition.initialVariant.name,
        rollWidthM: definition.initialVariant.rollWidthM ?? null,
        standardRollLengthM:
          definition.initialVariant.standardRollLengthM ?? null,
        thicknessMm: definition.initialVariant.thicknessMm ?? null,
        wearLayerMm: definition.initialVariant.wearLayerMm ?? null,
        tileLengthMm: definition.initialVariant.tileLengthMm ?? null,
        tileWidthMm: definition.initialVariant.tileWidthMm ?? null,
        packQuantity: definition.initialVariant.packQuantity ?? null,
        packCoverageM2: definition.initialVariant.packCoverageM2 ?? null,
        isDefault: true,
        createdById: owner.id,
        updatedById: owner.id,
      },
    });
  }

  const productRecords = await prisma.product.findMany({
    where: { tenantId: tenant.id },
    include: {
      variants: true,
    },
  });
  const productBySlug = new Map(productRecords.map((item) => [item.slug, item]));

  const supplierRecords = await Promise.all(
    [
      {
        legalName: "Pennine Flooring Distribution Ltd",
        tradingName: "Pennine Flooring Distribution",
        supplierCode: "PFD-001",
        accountNumber: "ACC-44021",
        email: "sales@pennineflooring:local",
        telephone: "+44 161 555 2200",
        website: "https://pennineflooring:local",
        addressLine1: "12 Millgate Trade Park",
        city: "Manchester",
        county: "Greater Manchester",
        postcode: "M11 3FD",
        typicalLeadTimeDays: 4,
        preferredSupplier: true,
        paymentTermsDescription: "30 days end of month",
        deliveryNotes: "Next-day delivery available on stocked carpet and vinyl.",
      },
      {
        legalName: "NorthWest Prep & Adhesives Ltd",
        tradingName: "NW Prep & Adhesives",
        supplierCode: "NPA-002",
        accountNumber: "ACC-55218",
        email: "orders@nwprep:local",
        telephone: "+44 151 555 1800",
        website: "https://nwprep:local",
        addressLine1: "4 Dockside Industrial Estate",
        city: "Liverpool",
        county: "Merseyside",
        postcode: "L3 4PT",
        typicalLeadTimeDays: 2,
        paymentTermsDescription: "30 days from invoice",
        deliveryNotes: "AM pallet deliveries for smoothing compounds and adhesives.",
      },
      {
        legalName: "TransEdge Profiles Ltd",
        tradingName: "TransEdge Profiles",
        supplierCode: "TEP-003",
        accountNumber: "ACC-77840",
        email: "trade@transedge:local",
        telephone: "+44 113 555 4100",
        website: "https://transedge:local",
        addressLine1: "88 Junction Road",
        city: "Leeds",
        county: "West Yorkshire",
        postcode: "LS11 8RR",
        typicalLeadTimeDays: 3,
        paymentTermsDescription: "14 days from dispatch",
        deliveryNotes: "Profiles cut to standard lengths only in Phase B.",
      },
      {
        legalName: "Timber & Laminate Hub Ltd",
        tradingName: "Timber & Laminate Hub",
        supplierCode: "TLH-004",
        accountNumber: "ACC-66319",
        email: "hello@timberhub:local",
        telephone: "+44 121 555 6320",
        website: "https://timberhub:local",
        addressLine1: "7 Kingsway Trade Centre",
        city: "Birmingham",
        county: "West Midlands",
        postcode: "B6 4AA",
        typicalLeadTimeDays: 5,
        paymentTermsDescription: "30 days from statement",
        deliveryNotes: "Laminate and timber lines dispatched from central warehouse.",
      },
    ].map((supplier) =>
      prisma.supplier.upsert({
        where: {
          tenantId_supplierCode: {
            tenantId: tenant.id,
            supplierCode: supplier.supplierCode,
          },
        },
        update: {
          ...supplier,
          branchId: headOffice.id,
          defaultCurrency: "GBP",
          countryCode: "GB",
          createdById: owner.id,
          updatedById: owner.id,
        },
        create: {
          tenantId: tenant.id,
          branchId: headOffice.id,
          defaultCurrency: "GBP",
          countryCode: "GB",
          ...supplier,
          createdById: owner.id,
          updatedById: owner.id,
        },
      }),
    ),
  );

  const supplierByCode = new Map(
    supplierRecords.map((supplier) => [supplier.supplierCode, supplier]),
  );

  await prisma.supplierContact.createMany({
    data: [
      {
        tenantId: tenant.id,
        supplierId: getRequiredMapValue(supplierByCode, "PFD-001", "supplier").id,
        name: "Ellie Dawson",
        jobTitle: "Sales Representative",
        email: "ellie.dawson@pennineflooring:local",
        telephone: "+44 161 555 2201",
        isPrimary: true,
        createdById: owner.id,
        updatedById: owner.id,
      },
      {
        tenantId: tenant.id,
        supplierId: getRequiredMapValue(supplierByCode, "PFD-001", "supplier").id,
        name: "Martin Shaw",
        jobTitle: "Accounts Contact",
        email: "accounts@pennineflooring:local",
        telephone: "+44 161 555 2209",
        isAccountsContact: true,
        createdById: owner.id,
        updatedById: owner.id,
      },
      {
        tenantId: tenant.id,
        supplierId: getRequiredMapValue(supplierByCode, "NPA-002", "supplier").id,
        name: "Jade Murphy",
        jobTitle: "Ordering Desk",
        email: "orders@nwprep:local",
        telephone: "+44 151 555 1801",
        isPrimary: true,
        isOrderingContact: true,
        createdById: owner.id,
        updatedById: owner.id,
      },
      {
        tenantId: tenant.id,
        supplierId: getRequiredMapValue(supplierByCode, "NPA-002", "supplier").id,
        name: "Tom Wilkes",
        jobTitle: "Technical Advisor",
        email: "technical@nwprep:local",
        mobile: "+44 7700 900401",
        isTechnicalContact: true,
        createdById: owner.id,
        updatedById: owner.id,
      },
      {
        tenantId: tenant.id,
        supplierId: getRequiredMapValue(supplierByCode, "TEP-003", "supplier").id,
        name: "Natalie Briggs",
        jobTitle: "Trade Support",
        email: "trade@transedge:local",
        telephone: "+44 113 555 4102",
        isPrimary: true,
        isOrderingContact: true,
        createdById: owner.id,
        updatedById: owner.id,
      },
      {
        tenantId: tenant.id,
        supplierId: getRequiredMapValue(supplierByCode, "TLH-004", "supplier").id,
        name: "Ryan Holt",
        jobTitle: "Commercial Sales",
        email: "ryan.holt@timberhub:local",
        telephone: "+44 121 555 6321",
        isPrimary: true,
        createdById: owner.id,
        updatedById: owner.id,
      },
    ],
    skipDuplicates: true,
  });

  await Promise.all(
    [
      {
        supplierCode: "PFD-001",
        productSlug: "heather-loop-carpet",
        supplierSku: "PFD-CARP-4M-001",
        supplierDescription: "Heather Loop Carpet 4m domestic roll",
        supplierUnitCode: "ROLL",
        rollWidthM: 4,
        standardRollLengthM: 30,
        minimumOrderQty: 1,
        leadTimeDays: 4,
        preferredSupplier: true,
      },
      {
        supplierCode: "PFD-001",
        productSlug: "metro-safe-sheet-vinyl",
        supplierSku: "PFD-SV-2M-020",
        supplierDescription: "Metro Safe sheet vinyl 2m roll",
        supplierUnitCode: "ROLL",
        rollWidthM: 2,
        standardRollLengthM: 20,
        minimumOrderQty: 1,
        leadTimeDays: 4,
        preferredSupplier: true,
      },
      {
        supplierCode: "NPA-002",
        productSlug: "bondflex-adhesive",
        supplierSku: "NPA-ADH-15KG",
        supplierDescription: "BondFlex 15kg tub",
        supplierUnitCode: "TUB",
        packQuantity: 1,
        minimumOrderQty: 1,
        leadTimeDays: 2,
        preferredSupplier: true,
      },
      {
        supplierCode: "NPA-002",
        productSlug: "smoothbase-compound",
        supplierSku: "NPA-SMO-20KG",
        supplierDescription: "SmoothBase 20kg bag",
        supplierUnitCode: "BAG",
        packQuantity: 1,
        minimumOrderQty: 5,
        leadTimeDays: 2,
        preferredSupplier: true,
      },
      {
        supplierCode: "TEP-003",
        productSlug: "edgeform-door-profile",
        supplierSku: "TEP-EDGE-09",
        supplierDescription: "EdgeForm threshold profile 0.9m",
        supplierUnitCode: "LM",
        minimumOrderQty: 10,
        leadTimeDays: 3,
        preferredSupplier: true,
      },
      {
        supplierCode: "TLH-004",
        productSlug: "oakcrest-laminate",
        supplierSku: "TLH-LAM-192",
        supplierDescription: "Oakcrest laminate 1.92m2 pack",
        supplierUnitCode: "PACK",
        packQuantity: 8,
        packCoverageM2: 1.92,
        minimumOrderQty: 4,
        leadTimeDays: 5,
        preferredSupplier: true,
      },
      {
        supplierCode: "PFD-001",
        productSlug: "granite-click-lvt",
        supplierSku: "PFD-LVT-212",
        supplierDescription: "Granite Click LVT 2.12m2 pack",
        supplierUnitCode: "PACK",
        packQuantity: 10,
        packCoverageM2: 2.12,
        minimumOrderQty: 3,
        leadTimeDays: 4,
        preferredSupplier: false,
      },
      {
        supplierCode: "PFD-001",
        productSlug: "cloudstep-underlay",
        supplierSku: "PFD-UND-11MM",
        supplierDescription: "CloudStep PU underlay 11mm roll",
        supplierUnitCode: "ROLL",
        rollWidthM: 1.37,
        standardRollLengthM: 11,
        minimumOrderQty: 1,
        leadTimeDays: 3,
        preferredSupplier: false,
      },
    ].map(async (link) => {
      const supplier = getRequiredMapValue(supplierByCode, link.supplierCode, "supplier");
      const product = getRequiredMapValue(productBySlug, link.productSlug, "product");
      const variant = product.variants.find((item) => item.isDefault) ?? null;
      const supplierUnit = getRequiredMapValue(unitByCode, link.supplierUnitCode, "unit");

      await prisma.supplierProduct.upsert({
        where: {
          tenantId_supplierId_supplierSku: {
            tenantId: tenant.id,
            supplierId: supplier.id,
            supplierSku: link.supplierSku,
          },
        },
        update: {
          productId: product.id,
          variantId: variant?.id ?? null,
          supplierUnitId: supplierUnit.id,
          supplierDescription: link.supplierDescription,
          packQuantity: link.packQuantity ?? null,
          packCoverageM2: link.packCoverageM2 ?? null,
          rollWidthM: link.rollWidthM ?? null,
          standardRollLengthM: link.standardRollLengthM ?? null,
          minimumOrderQty: link.minimumOrderQty ?? null,
          leadTimeDays: link.leadTimeDays ?? null,
          preferredSupplier: link.preferredSupplier,
          lastConfirmedAt: new Date("2026-07-16T09:00:00.000Z"),
          createdById: owner.id,
          updatedById: owner.id,
        },
        create: {
          tenantId: tenant.id,
          supplierId: supplier.id,
          productId: product.id,
          variantId: variant?.id ?? null,
          supplierUnitId: supplierUnit.id,
          supplierSku: link.supplierSku,
          supplierDescription: link.supplierDescription,
          packQuantity: link.packQuantity ?? null,
          packCoverageM2: link.packCoverageM2 ?? null,
          rollWidthM: link.rollWidthM ?? null,
          standardRollLengthM: link.standardRollLengthM ?? null,
          minimumOrderQty: link.minimumOrderQty ?? null,
          leadTimeDays: link.leadTimeDays ?? null,
          preferredSupplier: link.preferredSupplier,
          lastConfirmedAt: new Date("2026-07-16T09:00:00.000Z"),
          createdById: owner.id,
          updatedById: owner.id,
        },
      });
    }),
  );

  const supplierProductRecords = await prisma.supplierProduct.findMany({
    where: { tenantId: tenant.id },
    include: {
      supplier: true,
      product: {
        include: {
          category: true,
        },
      },
      supplierUnit: true,
    },
  });
  const supplierProductBySku = new Map(
    supplierProductRecords.map((item) => [item.supplierSku, item]),
  );

  await prisma.supplierProductPriceHistory.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.supplierProductPrice.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.supplierPriceListVersion.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.supplierPriceList.deleteMany({ where: { tenantId: tenant.id } });

  const priceListDefinitions = [
    {
      supplierCode: "PFD-001",
      name: "Pennine Spring 2026",
      reference: "PFD-SPR-2026",
      currency: "GBP",
      status: "SUPERSEDED" as const,
      sourceType: "NEGOTIATED" as const,
      effectiveDate: new Date("2026-03-01T00:00:00.000Z"),
      expiryDate: new Date("2026-05-31T23:59:59.000Z"),
      notes: "Historical supplier price list retained for comparison.",
      versions: [
        {
          versionNumber: 1,
          status: "SUPERSEDED" as const,
          effectiveDate: new Date("2026-03-01T00:00:00.000Z"),
          expiryDate: new Date("2026-05-31T23:59:59.000Z"),
          revisionReason: "Initial spring pricing",
        },
      ],
    },
    {
      supplierCode: "PFD-001",
      name: "Pennine Summer 2026",
      reference: "PFD-SUM-2026",
      currency: "GBP",
      status: "ACTIVE" as const,
      sourceType: "CSV_IMPORT" as const,
      effectiveDate: new Date("2026-06-01T00:00:00.000Z"),
      expiryDate: null,
      notes: "Current active negotiated prices for major flooring lines.",
      versions: [
        {
          versionNumber: 1,
          status: "ACTIVE" as const,
          effectiveDate: new Date("2026-06-01T00:00:00.000Z"),
          expiryDate: null,
          revisionReason: "Approved summer pricing activation",
        },
      ],
    },
    {
      supplierCode: "NPA-002",
      name: "NW Prep Draft July 2026",
      reference: "NPA-DR-2026-07",
      currency: "GBP",
      status: "DRAFT" as const,
      sourceType: "MANUAL" as const,
      effectiveDate: new Date("2026-07-20T00:00:00.000Z"),
      expiryDate: null,
      notes: "Draft preparation-material updates awaiting review.",
      versions: [
        {
          versionNumber: 1,
          status: "DRAFT" as const,
          effectiveDate: new Date("2026-07-20T00:00:00.000Z"),
          expiryDate: null,
          revisionReason: "Initial draft pricing",
        },
      ],
    },
  ] as const;

  const versionByKey = new Map<string, Awaited<
    ReturnType<typeof prisma.supplierPriceListVersion.create>
  >>();

  for (const definition of priceListDefinitions) {
    const supplier = getRequiredMapValue(supplierByCode, definition.supplierCode, "supplier");
    const priceList = await prisma.supplierPriceList.create({
      data: {
        tenantId: tenant.id,
        supplierId: supplier.id,
        name: definition.name,
        reference: definition.reference,
        currency: definition.currency,
        status: definition.status,
        sourceType: definition.sourceType,
        effectiveDate: definition.effectiveDate,
        expiryDate: definition.expiryDate,
        notes: definition.notes,
        createdById: owner.id,
        updatedById: owner.id,
        approvedById:
          definition.status === "ACTIVE" || definition.status === "SUPERSEDED"
            ? manager.id
            : null,
        approvedAt:
          definition.status === "ACTIVE" || definition.status === "SUPERSEDED"
            ? new Date("2026-06-01T08:00:00.000Z")
            : null,
      },
    });

    for (const versionDefinition of definition.versions) {
      const version = await prisma.supplierPriceListVersion.create({
        data: {
          tenantId: tenant.id,
          supplierId: supplier.id,
          priceListId: priceList.id,
          versionNumber: versionDefinition.versionNumber,
          status: versionDefinition.status,
          effectiveDate: versionDefinition.effectiveDate,
          expiryDate: versionDefinition.expiryDate,
          currency: definition.currency,
          sourceType: definition.sourceType,
          revisionReason: versionDefinition.revisionReason,
          createdById: owner.id,
          approvedById:
            versionDefinition.status === "ACTIVE" ||
            versionDefinition.status === "SUPERSEDED"
              ? manager.id
              : null,
          approvedAt:
            versionDefinition.status === "ACTIVE" ||
            versionDefinition.status === "SUPERSEDED"
              ? new Date("2026-06-01T08:00:00.000Z")
              : null,
          supersededAt:
            versionDefinition.status === "SUPERSEDED"
              ? new Date("2026-06-01T08:00:00.000Z")
              : null,
        },
      });

      versionByKey.set(`${definition.reference}:${version.versionNumber}`, version);
    }
  }

  const priceDefinitions = [
    {
      supplierSku: "PFD-CARP-4M-001",
      versionKey: "PFD-SPR-2026:1",
      priceBasis: "SQUARE_METRE" as const,
      baseCost: "14.9500",
      areaCost: "14.9500",
      effectiveDate: new Date("2026-03-01T00:00:00.000Z"),
      expiryDate: new Date("2026-05-31T23:59:59.000Z"),
    },
    {
      supplierSku: "PFD-CARP-4M-001",
      versionKey: "PFD-SUM-2026:1",
      priceBasis: "SQUARE_METRE" as const,
      baseCost: "16.2500",
      areaCost: "16.2500",
      effectiveDate: new Date("2026-06-01T00:00:00.000Z"),
      expiryDate: null,
    },
    {
      supplierSku: "PFD-CARP-4M-001",
      versionKey: "PFD-SUM-2026:1",
      priceBasis: "ROLL" as const,
      baseCost: "1895.0000",
      rollCost: "1895.0000",
      effectiveDate: new Date("2026-06-01T00:00:00.000Z"),
      expiryDate: null,
    },
    {
      supplierSku: "PFD-LVT-212",
      versionKey: "PFD-SUM-2026:1",
      priceBasis: "PACK" as const,
      baseCost: "38.7500",
      packCost: "38.7500",
      promotionalCost: "36.5000",
      promotionStart: new Date("2026-07-10T00:00:00.000Z"),
      promotionEnd: new Date("2026-07-31T23:59:59.000Z"),
      effectiveDate: new Date("2026-06-01T00:00:00.000Z"),
      expiryDate: null,
    },
    {
      supplierSku: "PFD-SV-2M-020",
      versionKey: "PFD-SUM-2026:1",
      priceBasis: "SQUARE_METRE" as const,
      baseCost: "19.4000",
      areaCost: "19.4000",
      effectiveDate: new Date("2026-06-01T00:00:00.000Z"),
      expiryDate: null,
    },
    {
      supplierSku: "PFD-UND-11MM",
      versionKey: "PFD-SUM-2026:1",
      priceBasis: "ROLL" as const,
      baseCost: "121.0000",
      rollCost: "121.0000",
      effectiveDate: new Date("2026-06-01T00:00:00.000Z"),
      expiryDate: null,
    },
    {
      supplierSku: "NPA-ADH-15KG",
      versionKey: "NPA-DR-2026-07:1",
      priceBasis: "TUB" as const,
      baseCost: "42.5000",
      effectiveDate: new Date("2026-07-20T00:00:00.000Z"),
      expiryDate: null,
    },
    {
      supplierSku: "NPA-SMO-20KG",
      versionKey: "NPA-DR-2026-07:1",
      priceBasis: "BAG" as const,
      baseCost: "16.9500",
      effectiveDate: new Date("2026-07-20T00:00:00.000Z"),
      expiryDate: null,
    },
    {
      supplierSku: "TEP-EDGE-09",
      versionKey: "PFD-SUM-2026:1",
      priceBasis: "EACH" as const,
      baseCost: "8.9500",
      effectiveDate: new Date("2026-06-01T00:00:00.000Z"),
      expiryDate: null,
    },
  ] as const;

  const currentPriceBySkuAndBasis = new Map<
    string,
    Awaited<ReturnType<typeof prisma.supplierProductPrice.create>>
  >();

  for (const definition of priceDefinitions) {
    const supplierProduct = getRequiredMapValue(
      supplierProductBySku,
      definition.supplierSku,
      "supplier product",
    );
    const version = getRequiredMapValue(versionByKey, definition.versionKey, "price version");
    const price = await prisma.supplierProductPrice.create({
      data: {
        tenantId: tenant.id,
        supplierId: supplierProduct.supplierId,
        supplierProductId: supplierProduct.id,
        priceListVersionId: version.id,
        pricingUnitId: supplierProduct.supplierUnitId,
        priceBasis: definition.priceBasis,
        currency: "GBP",
        baseCost: definition.baseCost,
        packCost: "packCost" in definition ? definition.packCost ?? null : null,
        rollCost: "rollCost" in definition ? definition.rollCost ?? null : null,
        areaCost: "areaCost" in definition ? definition.areaCost ?? null : null,
        minimumOrderQty: supplierProduct.minimumOrderQty ?? null,
        promotionalCost:
          "promotionalCost" in definition ? definition.promotionalCost ?? null : null,
        promotionStart:
          "promotionStart" in definition ? definition.promotionStart ?? null : null,
        promotionEnd:
          "promotionEnd" in definition ? definition.promotionEnd ?? null : null,
        effectiveDate: definition.effectiveDate,
        expiryDate: definition.expiryDate,
        isActive: true,
        createdById: owner.id,
        updatedById: owner.id,
      },
    });

    if (!definition.expiryDate) {
      currentPriceBySkuAndBasis.set(`${definition.supplierSku}:${definition.priceBasis}`, price);
    }

    await prisma.supplierProductPriceHistory.create({
      data: {
        tenantId: tenant.id,
        supplierId: supplierProduct.supplierId,
        supplierProductId: supplierProduct.id,
        supplierProductPriceId: price.id,
        priceListVersionId: version.id,
        currency: "GBP",
        priceBasis: definition.priceBasis,
        previousBaseCost:
          definition.versionKey === "PFD-SUM-2026:1" &&
          definition.supplierSku === "PFD-CARP-4M-001" &&
          definition.priceBasis === "SQUARE_METRE"
            ? "14.9500"
            : null,
        newBaseCost: definition.baseCost,
        previousPromotionalCost: null,
        newPromotionalCost:
          "promotionalCost" in definition ? definition.promotionalCost ?? null : null,
        effectiveDate: definition.effectiveDate,
        approvalStatus: version.status,
        changeReason:
          definition.versionKey === "PFD-SPR-2026:1"
            ? "Historical baseline pricing"
            : definition.versionKey === "PFD-SUM-2026:1"
              ? "Approved summer 2026 pricing update"
              : "Draft supplier review",
        sourceType:
          definition.versionKey === "PFD-SUM-2026:1" ? "CSV_IMPORT" : "MANUAL",
        sourceLabel: definition.versionKey.split(":")[0] ?? null,
        actorUserId: owner.id,
      },
    });
  }

  await prisma.productAttributeDefinition.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: "wear-layer" } },
    update: {
      name: "Wear layer",
      categoryId: categoryBySlug.get("lvt")?.id ?? null,
      valueType: "NUMBER",
      isRequired: false,
      isFilterable: true,
      createdById: owner.id,
      updatedById: owner.id,
    },
    create: {
      tenantId: tenant.id,
      key: "wear-layer",
      name: "Wear layer",
      categoryId: categoryBySlug.get("lvt")?.id ?? null,
      valueType: "NUMBER",
      isRequired: false,
      isFilterable: true,
      createdById: owner.id,
      updatedById: owner.id,
    },
  });

  await prisma.stockReservation.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.stockBalance.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.inventoryWarehouse.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.job.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.quoteVersion.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.quoteLine.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.quote.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.estimateVersion.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.estimateLine.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.estimateRoom.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.estimate.deleteMany({ where: { tenantId: tenant.id } });

  const money = (value: number | string | Prisma.Decimal) => new Prisma.Decimal(value);
  const calculateSeedLine = (input: {
    lineType: EstimateLineType;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    unitSellPrice: Prisma.Decimal;
    vatRate: Prisma.Decimal;
  }) => {
    const sign =
      input.lineType === EstimateLineType.DISCOUNT
        ? new Prisma.Decimal(-1)
        : new Prisma.Decimal(1);
    const costTotal = input.quantity.mul(input.unitCost);
    const sellTotal = input.quantity.mul(input.unitSellPrice).mul(sign);
    const marginAmount = sellTotal.minus(costTotal.mul(sign));
    const marginPercent = sellTotal.equals(0)
      ? new Prisma.Decimal(0)
      : marginAmount.div(sellTotal).mul(100);
    const vatAmount = sellTotal.mul(input.vatRate);
    const lineTotal = sellTotal.plus(vatAmount);
    return { costTotal, sellTotal, marginAmount, marginPercent, vatAmount, lineTotal };
  };
  const summarizeSeedEstimate = (
    lines: Array<{
      lineType: EstimateLineType;
      costTotal: Prisma.Decimal;
      sellTotal: Prisma.Decimal;
      vatAmount: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }>,
    vatRate: Prisma.Decimal,
  ) => {
    const subtotal = lines.reduce((sum, line) => sum.plus(line.sellTotal), money(0));
    const materialCost = lines
      .filter((line) => line.lineType === EstimateLineType.MATERIAL)
      .reduce((sum, line) => sum.plus(line.costTotal), money(0));
    const labourCost = lines
      .filter((line) => line.lineType === EstimateLineType.LABOUR)
      .reduce((sum, line) => sum.plus(line.costTotal), money(0));
    const accessoryCost = lines
      .filter((line) => line.lineType === EstimateLineType.ACCESSORY)
      .reduce((sum, line) => sum.plus(line.costTotal), money(0));
    const supplierCost = materialCost.plus(accessoryCost);
    const discountAmount = lines
      .filter((line) => line.lineType === EstimateLineType.DISCOUNT)
      .reduce((sum, line) => sum.plus(line.sellTotal.abs()), money(0));
    const vatAmount = lines.reduce((sum, line) => sum.plus(line.vatAmount), money(0));
    const grandTotal = lines.reduce((sum, line) => sum.plus(line.lineTotal), money(0));
    const grossProfit = subtotal.minus(materialCost).minus(labourCost).minus(accessoryCost);
    const grossMarginPercent = subtotal.equals(0)
      ? money(0)
      : grossProfit.div(subtotal).mul(100);
    return {
      subtotal,
      materialCost,
      labourCost,
      accessoryCost,
      supplierCost,
      marginAmount: grossProfit,
      discountAmount,
      vatRate,
      vatAmount,
      grandTotal,
      grossProfit,
      grossMarginPercent,
    };
  };

  const carpetProduct = getRequiredMapValue(productBySlug, "heather-loop-carpet", "product");
  const carpetVariant = carpetProduct.variants.find((item) => item.isDefault) ?? null;
  const carpetSupplierProduct = getRequiredMapValue(
    supplierProductBySku,
    "PFD-CARP-4M-001",
    "supplier product",
  );
  const carpetPrice = getRequiredMapValue(
    currentPriceBySkuAndBasis,
    "PFD-CARP-4M-001:SQUARE_METRE",
    "supplier product price",
  );
  const edgeProduct = getRequiredMapValue(productBySlug, "edgeform-door-profile", "product");
  const edgeVariant = edgeProduct.variants.find((item) => item.isDefault) ?? null;
  const edgeSupplierProduct = getRequiredMapValue(
    supplierProductBySku,
    "TEP-EDGE-09",
    "supplier product",
  );
  const edgePrice = getRequiredMapValue(
    currentPriceBySkuAndBasis,
    "TEP-EDGE-09:EACH",
    "supplier product price",
  );
  const vatRate = money("0.2");
  const loungeArea = money("22.7810");
  const carpetLine = calculateSeedLine({
    lineType: EstimateLineType.MATERIAL,
    quantity: loungeArea,
    unitCost: money(carpetPrice.baseCost),
    unitSellPrice: money("31.50"),
    vatRate,
  });
  const labourLine = calculateSeedLine({
    lineType: EstimateLineType.LABOUR,
    quantity: money("18"),
    unitCost: money("22"),
    unitSellPrice: money("42"),
    vatRate,
  });
  const accessoryLine = calculateSeedLine({
    lineType: EstimateLineType.ACCESSORY,
    quantity: money("8"),
    unitCost: money(edgePrice.baseCost),
    unitSellPrice: money("15"),
    vatRate,
  });
  const estimateSummary = summarizeSeedEstimate(
    [
      { lineType: EstimateLineType.MATERIAL, ...carpetLine },
      { lineType: EstimateLineType.LABOUR, ...labourLine },
      { lineType: EstimateLineType.ACCESSORY, ...accessoryLine },
    ],
    vatRate,
  );

  const calculatedEstimate = await prisma.estimate.create({
    data: {
      tenantId: tenant.id,
      branchId: headOffice.id,
      customerId: demoCustomer.id,
      siteId: demoSite.id,
      estimateNumber: "EST-2026-000001",
      status: "READY_FOR_QUOTE",
      title: "Johnson lounge and hallway carpet refit",
      currency: "GBP",
      ...estimateSummary,
      internalNotes: "Seeded estimate for previewing measurement-to-price calculations.",
      customerNotes: "Includes lounge, hallway threshold profiles, labour and VAT.",
      createdById: owner.id,
      updatedById: owner.id,
      rooms: {
        create: [
          {
            tenantId: tenant.id,
            roomName: "Lounge",
            grossArea: "20.7100",
            deductionArea: "0",
            netArea: "20.7100",
            wastePercent: "10",
            requiredArea: loungeArea,
            perimeter: "18.4000",
            notes: "Waste-adjusted area carried into material line.",
            displayOrder: 0,
          },
          {
            tenantId: tenant.id,
            roomName: "Hallway",
            grossArea: "7.1200",
            deductionArea: "0.4000",
            netArea: "6.7200",
            wastePercent: "10",
            requiredArea: "7.3920",
            perimeter: "11.6000",
            displayOrder: 1,
          },
        ],
      },
      lines: {
        create: [
          {
            tenantId: tenant.id,
            lineType: "MATERIAL",
            productId: carpetProduct.id,
            productVariantId: carpetVariant?.id ?? null,
            supplierProductId: carpetSupplierProduct.id,
            supplierProductPriceId: carpetPrice.id,
            description: "Heather Loop Carpet supplied and cut",
            quantity: loungeArea,
            unit: "SQM",
            unitCost: carpetPrice.baseCost,
            unitSellPrice: "31.5000",
            ...carpetLine,
            vatRate,
            priceSnapshot: {
              supplierPriceId: carpetPrice.id,
              priceListVersionId: carpetPrice.priceListVersionId,
              priceBasis: carpetPrice.priceBasis,
              currency: carpetPrice.currency,
              baseCost: carpetPrice.baseCost,
              supplierSku: carpetSupplierProduct.supplierSku,
            },
            displayOrder: 0,
          },
          {
            tenantId: tenant.id,
            lineType: "LABOUR",
            description: "Preparation, fitting and finishing labour",
            quantity: "18",
            unit: "HOUR",
            unitCost: "22",
            unitSellPrice: "42",
            ...labourLine,
            vatRate,
            displayOrder: 1,
          },
          {
            tenantId: tenant.id,
            lineType: "ACCESSORY",
            productId: edgeProduct.id,
            productVariantId: edgeVariant?.id ?? null,
            supplierProductId: edgeSupplierProduct.id,
            supplierProductPriceId: edgePrice.id,
            description: "Door threshold profiles",
            quantity: "8",
            unit: "EACH",
            unitCost: edgePrice.baseCost,
            unitSellPrice: "15",
            ...accessoryLine,
            vatRate,
            priceSnapshot: {
              supplierPriceId: edgePrice.id,
              priceListVersionId: edgePrice.priceListVersionId,
              priceBasis: edgePrice.priceBasis,
              currency: edgePrice.currency,
              baseCost: edgePrice.baseCost,
              supplierSku: edgeSupplierProduct.supplierSku,
            },
            displayOrder: 2,
          },
        ],
      },
    },
    include: { rooms: true, lines: true },
  });

  await prisma.estimateVersion.create({
    data: {
      tenantId: tenant.id,
      estimateId: calculatedEstimate.id,
      versionNumber: 1,
      status: "READY_FOR_QUOTE",
      currency: calculatedEstimate.currency,
      subtotal: calculatedEstimate.subtotal,
      materialCost: calculatedEstimate.materialCost,
      labourCost: calculatedEstimate.labourCost,
      accessoryCost: calculatedEstimate.accessoryCost,
      supplierCost: calculatedEstimate.supplierCost,
      marginAmount: calculatedEstimate.marginAmount,
      discountAmount: calculatedEstimate.discountAmount,
      vatRate: calculatedEstimate.vatRate,
      vatAmount: calculatedEstimate.vatAmount,
      grandTotal: calculatedEstimate.grandTotal,
      grossProfit: calculatedEstimate.grossProfit,
      grossMarginPercent: calculatedEstimate.grossMarginPercent,
      snapshot: JSON.parse(JSON.stringify(calculatedEstimate)),
      createdById: owner.id,
    },
  });

  await prisma.estimate.create({
    data: {
      tenantId: tenant.id,
      branchId: headOffice.id,
      customerId: demoCustomer.id,
      siteId: demoSite.id,
      estimateNumber: "EST-2026-000002",
      status: "DRAFT",
      title: "Johnson bathroom vinyl draft",
      currency: "GBP",
      internalNotes: "Draft seeded record for create/edit preview paths.",
      createdById: manager.id,
      updatedById: manager.id,
    },
  });

  await prisma.numberSequence.update({
    where: { tenantId_key: { tenantId: tenant.id, key: "estimate" } },
    data: { nextValue: 3, prefix: "EST", padding: 6 },
  });

  const seededQuote = await prisma.quote.create({
    data: {
      tenantId: tenant.id,
      branchId: headOffice.id,
      customerId: demoCustomer.id,
      siteId: demoSite.id,
      estimateId: calculatedEstimate.id,
      quoteNumber: "QUO-2026-000001",
      status: "CONVERTED",
      title: "Quote for Johnson lounge and hallway carpet refit",
      currency: calculatedEstimate.currency,
      subtotal: calculatedEstimate.subtotal,
      discountAmount: calculatedEstimate.discountAmount,
      vatRate: calculatedEstimate.vatRate,
      vatAmount: calculatedEstimate.vatAmount,
      grandTotal: calculatedEstimate.grandTotal,
      depositRequired: money(calculatedEstimate.grandTotal).mul("0.25"),
      depositPaid: money(calculatedEstimate.grandTotal).mul("0.25"),
      validUntil: new Date("2026-08-31T23:59:59.000Z"),
      terms: "25% deposit to secure installation slot. Balance due on completion.",
      customerNotes: calculatedEstimate.customerNotes,
      internalNotes: "Seeded quote linked to EST-2026-000001.",
      createdById: owner.id,
      updatedById: owner.id,
      sentById: manager.id,
      approvedById: owner.id,
      sentAt: new Date("2026-07-23T10:00:00.000Z"),
      approvedAt: new Date("2026-07-23T11:00:00.000Z"),
      lines: {
        create: calculatedEstimate.lines.map((line, index) => ({
          tenantId: tenant.id,
          sourceEstimateLineId: line.id,
          lineType: line.lineType,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitSellPrice: line.unitSellPrice,
          sellTotal: line.sellTotal,
          vatRate: line.vatRate,
          vatAmount: line.vatAmount,
          lineTotal: line.lineTotal,
          notes: line.notes,
          displayOrder: index,
        })),
      },
    },
    include: { lines: true },
  });

  await prisma.quoteVersion.create({
    data: {
      tenantId: tenant.id,
      quoteId: seededQuote.id,
      versionNumber: 1,
      status: "APPROVED",
      currency: seededQuote.currency,
      subtotal: seededQuote.subtotal,
      discountAmount: seededQuote.discountAmount,
      vatRate: seededQuote.vatRate,
      vatAmount: seededQuote.vatAmount,
      grandTotal: seededQuote.grandTotal,
      depositRequired: seededQuote.depositRequired,
      snapshot: JSON.parse(JSON.stringify(seededQuote)),
      createdById: manager.id,
    },
  });

  await prisma.numberSequence.update({
    where: { tenantId_key: { tenantId: tenant.id, key: "quote" } },
    data: { nextValue: 2, prefix: "QUO", padding: 6 },
  });

  const estimateLineById = new Map(calculatedEstimate.lines.map((line) => [line.id, line]));
  const seededJob = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      branchId: headOffice.id,
      customerId: demoCustomer.id,
      siteId: demoSite.id,
      quoteId: seededQuote.id,
      jobNumber: "JOB-2026-000001",
      status: "SCHEDULED",
      title: "Johnson lounge and hallway carpet refit",
      currency: seededQuote.currency,
      totalValue: seededQuote.grandTotal,
      depositRequired: seededQuote.depositRequired,
      depositPaid: seededQuote.depositPaid,
      scheduledStart: new Date("2026-08-10T08:00:00.000Z"),
      scheduledEnd: new Date("2026-08-10T16:00:00.000Z"),
      accessNotes: "Parking available on driveway.",
      workNotes: "Converted from seeded quote QUO-2026-000001.",
      createdById: owner.id,
      updatedById: owner.id,
    },
  });

  await prisma.materialRequirement.createMany({
    data: seededQuote.lines
      .filter((line) => line.lineType === "MATERIAL" || line.lineType === "ACCESSORY")
      .map((line) => {
        const estimateLine = line.sourceEstimateLineId
          ? estimateLineById.get(line.sourceEstimateLineId)
          : null;
        return {
          tenantId: tenant.id,
          branchId: headOffice.id,
          jobId: seededJob.id,
          sourceQuoteLineId: line.id,
          sourceEstimateLineId: line.sourceEstimateLineId,
          productId: estimateLine?.productId ?? null,
          productVariantId: estimateLine?.productVariantId ?? null,
          supplierProductId: estimateLine?.supplierProductId ?? null,
          description: line.description,
          requiredQuantity: line.quantity,
          unit: line.unit,
          requiredDate: seededJob.scheduledStart,
          notes: "Seeded material requirement generated from QUO-2026-000001.",
          createdById: owner.id,
          updatedById: owner.id,
        };
      }),
  });

  const defaultWarehouse = await prisma.inventoryWarehouse.create({
    data: {
      tenantId: tenant.id,
      branchId: headOffice.id,
      code: "MAIN",
      name: "Main stockroom",
      isDefault: true,
      addressLine1: headOffice.addressLine1,
      city: headOffice.city,
      postcode: headOffice.postcode,
    },
  });

  await prisma.stockBalance.createMany({
    data: [
      {
        tenantId: tenant.id,
        branchId: headOffice.id,
        warehouseId: defaultWarehouse.id,
        productId: carpetProduct.id,
        productVariantId: carpetVariant?.id ?? null,
        supplierProductId: carpetSupplierProduct.id,
        unit: "SQM",
        onHandQuantity: "45.0000",
      },
      {
        tenantId: tenant.id,
        branchId: headOffice.id,
        warehouseId: defaultWarehouse.id,
        productId: edgeProduct.id,
        productVariantId: edgeVariant?.id ?? null,
        supplierProductId: edgeSupplierProduct.id,
        unit: "EACH",
        onHandQuantity: "20.0000",
      },
    ],
  });

  await prisma.numberSequence.update({
    where: { tenantId_key: { tenantId: tenant.id, key: "job" } },
    data: { nextValue: 2, prefix: "JOB", padding: 6 },
  });

  await seedProcurement(prisma, tenant, headOffice, owner, manager);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
