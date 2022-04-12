import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../user/user.module';


@Module({
    imports: [ConfigModule, UserModule],
    controllers: [VerificationController],
    providers: [VerificationService],
    exports: [VerificationService]  //Need to access in PublicController
})
export class VerificationModule { }
