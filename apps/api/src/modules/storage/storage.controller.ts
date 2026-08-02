import { Controller, Post, Get, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { StorageService } from './storage.service';
import { RequestUploadUrlSchema } from './dto/storage.dto';
import { AuthGuard } from '../../shared/auth.guard';
import { CurrentSession } from '../../shared/session.decorator';

@Controller({ path: 'storage', version: '1' })
@UseGuards(AuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  async getUploadUrl(
    @CurrentSession() session: any,
    @Body() body: unknown,
  ) {
    const dto = RequestUploadUrlSchema.parse(body);
    return this.storageService.createPresignedUploadUrl(session, dto);
  }

  @Post('confirm/:id')
  async confirmUpload(
    @CurrentSession() session: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.storageService.confirmUpload(session, id);
  }

  @Get('download-url/:id')
  async getDownloadUrl(
    @CurrentSession() session: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.storageService.generateDownloadUrl(session, id);
  }
}
