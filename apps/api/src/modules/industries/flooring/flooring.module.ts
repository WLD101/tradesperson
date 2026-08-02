import { Module } from '@nestjs/common';
import { FlooringService } from './flooring.service';
import { FlooringController } from './flooring.controller';

@Module({
  providers: [FlooringService],
  controllers: [FlooringController],
  exports: [FlooringService],
})
export class FlooringModule {}
