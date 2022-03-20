import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { ConfigModule } from '@nestjs/config';


@Module({
    imports: [ConfigModule],
    controllers: [VerificationController],
    providers: [VerificationService],
    exports: [VerificationService]  //Need to access in PublicController
})
export class VerificationModule { }
