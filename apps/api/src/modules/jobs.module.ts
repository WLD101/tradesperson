import { Body, Controller, Get, Module, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JobStatus } from "@prisma/client/index";
import { z } from "zod";
import { JobsService } from "../services/jobs.service";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  status: z.string().trim().min(1).max(60).optional(),
});

const createJobSchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  title: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
  scheduledStart: z.coerce.date().nullable().optional(),
  scheduledEnd: z.coerce.date().nullable().optional(),
  accessNotes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
  workNotes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
});

const createRequisitionFromRequirementsSchema = z.object({
  materialRequirementIds: z.array(z.string().uuid()).optional(),
  requiredDate: z.coerce.date().nullable().optional(),
  purpose: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
  internalNotes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
});

const scheduleJobSchema = z.object({
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date(),
  accessNotes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
  workNotes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
});

const completeJobSchema = z.object({
  completedAt: z.coerce.date().optional(),
  completionNotes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
  customerSignoffName: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
});

const createInvoiceSchema = z.object({
  dueDate: z.preprocess(emptyStringToNull, z.coerce.date().nullable()).optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
});

const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.preprocess(emptyStringToNull, z.string().max(80).nullable()).optional(),
  reference: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
  idempotencyKey: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
  paidAt: z.preprocess(emptyStringToNull, z.coerce.date().nullable()).optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
});

const materialReturnSchema = z.object({
  idempotencyKey: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
  lines: z.array(z.object({
    stockReservationId: z.string().uuid(),
    usableQuantity: z.coerce.number().nonnegative().optional(),
    damagedQuantity: z.coerce.number().nonnegative().optional(),
    notes: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
  })).min(1),
});

type TenantSession = Parameters<JobsService["listJobs"]>[0];

@Controller({ version: "1" })
class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get("jobs")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("job:read")
  listJobs(@Query() query: unknown, @CurrentSession() session: TenantSession) {
    return this.jobs.listJobs(session, listQuerySchema.parse(query));
  }

  @Get("jobs/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("job:read")
  getJob(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.jobs.getJob(session, id);
  }

  @Post("quotes/:quoteId/create-job")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("job:create")
  createFromQuote(
    @Param("quoteId") quoteId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.jobs.createFromQuote(session, quoteId, createJobSchema.parse(body) as any);
  }

  @Post("jobs/:id/material-requirements/generate")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("job:write")
  generateMaterialRequirements(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.jobs.generateMaterialRequirements(session, id);
  }

  @Post("jobs/:id/material-requirements/create-requisition")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("job:write", "procurement:requisition:create")
  createRequisitionFromRequirements(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.jobs.createRequisitionFromRequirements(
      session,
      id,
      createRequisitionFromRequirementsSchema.parse(body),
    );
  }

  @Post("jobs/:id/material-requirements/reserve-stock")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("job:write")
  reserveStockForJob(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.jobs.reserveStockForJob(session, id);
  }

  @Post("jobs/:id/material-requirements/issue-stock")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("job:write")
  issueReservedStockForJob(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.jobs.issueReservedStockForJob(session, id);
  }

  @Post("jobs/:id/material-requirements/return-stock")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("job:write")
  returnJobStock(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.jobs.returnJobStock(session, id, materialReturnSchema.parse(body));
  }

  @Post("jobs/:id/schedule")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("job:write")
  scheduleJob(@Param("id") id: string, @Body() body: unknown, @CurrentSession() session: TenantSession) {
    return this.jobs.scheduleJob(session, id, scheduleJobSchema.parse(body));
  }

  @Post("jobs/:id/complete")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("job:write")
  completeJob(@Param("id") id: string, @Body() body: unknown, @CurrentSession() session: TenantSession) {
    return this.jobs.completeJob(session, id, completeJobSchema.parse(body));
  }

  @Post("jobs/:id/create-invoice")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("job:write")
  createInvoiceFromJob(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.jobs.createInvoiceFromJob(session, id, createInvoiceSchema.parse(body));
  }

  @Post("invoices/:invoiceId/payments")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("job:write")
  recordInvoicePayment(
    @Param("invoiceId") invoiceId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.jobs.recordInvoicePayment(session, invoiceId, recordPaymentSchema.parse(body));
  }
}

@Module({
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
