import { Body, Controller, Get, Module, Param, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { QuotesService } from "../services/quotes.service";
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

const createFromEstimateSchema = z.object({
  title: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
  depositRequired: z.coerce.number().nonnegative().nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  terms: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
  customerNotes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
  internalNotes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
});

type TenantSession = Parameters<QuotesService["listQuotes"]>[0];

@Controller({ version: "1" })
class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get("quotes")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("quote:read")
  listQuotes(@Query() query: unknown, @CurrentSession() session: TenantSession) {
    return this.quotes.listQuotes(session, listQuerySchema.parse(query));
  }

  @Get("quotes/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("quote:read")
  getQuote(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.quotes.getQuote(session, id);
  }

  @Post("estimates/:estimateId/create-quote")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("quote:create")
  createFromEstimate(
    @Param("estimateId") estimateId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.quotes.createFromEstimate(
      session,
      estimateId,
      createFromEstimateSchema.parse(body) as any,
    );
  }

  @Post("quotes/:id/send")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("quote:send")
  sendQuote(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.quotes.sendQuote(session, id);
  }

  @Post("quotes/:id/approve")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("quote:approve")
  approveQuote(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.quotes.approveQuote(session, id);
  }

  @Post("quotes/:id/reject")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("quote:approve")
  rejectQuote(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.quotes.rejectQuote(session, id);
  }
}

@Module({
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
