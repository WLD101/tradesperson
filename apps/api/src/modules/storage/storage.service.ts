import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, type S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../services/prisma.service';
import { BranchAccessService } from '../../services/branch-access.service';
import { TenantAccessService } from '../../services/tenant-access.service';
import { RequestUploadUrlDto } from './dto/storage.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly branchAccess: BranchAccessService,
  ) {
    const accessKeyId =
      this.configService.get<string>('AWS_ACCESS_KEY_ID') ??
      this.configService.getOrThrow<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey =
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ??
      this.configService.getOrThrow<string>('S3_SECRET_ACCESS_KEY');

    this.bucketName =
      this.configService.get<string>('S3_BUCKET_NAME') ??
      this.configService.getOrThrow<string>('S3_BUCKET');
    
    const s3Config: S3ClientConfig = {
      region:
        this.configService.get<string>('AWS_REGION') ??
        this.configService.get<string>('S3_REGION', 'us-east-1'),
      forcePathStyle: this.configService.get<string>('NODE_ENV') !== 'production',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    };

    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    if (endpoint) {
      s3Config.endpoint = endpoint;
    }

    this.s3Client = new S3Client(s3Config);
  }

  async createPresignedUploadUrl(
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
    dto: RequestUploadUrlDto,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    await this.ensureEntityAccess(session, dto.entityType, dto.entityId);
    const fileId = uuidv4();
    const sanitizedFileName = dto.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `${tenantId}/${dto.entityType.toLowerCase()}/${dto.entityId}/${fileId}-${sanitizedFileName}`;

    // 1. Create PENDING DB record
    const attachment = await this.prisma.client.fileAttachment.create({
      data: {
        id: fileId,
        tenantId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        storageKey,
        fileName: dto.fileName,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        status: 'PENDING',
        createdBy: session.user.id,
      },
    });

    // 2. Generate presigned PUT URL (valid for 15 minutes)
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      ContentType: dto.contentType,
      ContentLength: dto.sizeBytes,
      Metadata: {
        tenantId,
        uploadedBy: session.user.id,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return {
      fileId: attachment.id,
      uploadUrl,
      storageKey,
    };
  }

  async confirmUpload(session: Parameters<TenantAccessService["ensureTenant"]>[0], fileId: string) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const attachment = await this.prisma.client.fileAttachment.findFirst({
      where: { id: fileId, tenantId },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment record not found.');
    }

    await this.ensureEntityAccess(session, attachment.entityType, attachment.entityId);

    return this.prisma.client.fileAttachment.update({
      where: { id: fileId },
      data: { status: 'UPLOADED' },
    });
  }

  async generateDownloadUrl(session: Parameters<TenantAccessService["ensureTenant"]>[0], fileId: string) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const attachment = await this.prisma.client.fileAttachment.findFirst({
      where: { id: fileId, tenantId, status: 'UPLOADED' },
    });

    if (!attachment) {
      throw new NotFoundException('File attachment not found or upload incomplete.');
    }
    await this.ensureEntityAccess(session, attachment.entityType, attachment.entityId);

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: attachment.storageKey,
      ResponseContentDisposition: `inline; filename="${attachment.fileName}"`,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return {
      downloadUrl,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
    };
  }

  private async ensureEntityAccess(
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
    entityType: string,
    entityId: string,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const branchWhere = this.branchAccess.branchWhere(session, tenantId);
    const entity =
      entityType === 'JOB'
        ? await this.prisma.client.job.findFirst({ where: { id: entityId, tenantId, ...branchWhere }, select: { id: true } })
        : entityType === 'CUSTOMER'
          ? await this.prisma.client.customer.findFirst({ where: { id: entityId, tenantId, ...branchWhere }, select: { id: true } })
          : entityType === 'QUOTE'
            ? await this.prisma.client.quote.findFirst({ where: { id: entityId, tenantId, ...branchWhere }, select: { id: true } })
            : entityType === 'REQUISITION'
              ? await this.prisma.client.purchaseRequisition.findFirst({ where: { id: entityId, tenantId, ...branchWhere }, select: { id: true } })
              : entityType === 'PRODUCT'
                ? await this.prisma.client.product.findFirst({ where: { id: entityId, tenantId }, select: { id: true } })
                : null;

    if (!entity) {
      throw new NotFoundException('Attachment target not found.');
    }
  }
}
