import { Module } from "@nestjs/common";
import { DBProvider } from './DBProvider';


@Module({
    providers: [ DBProvider ],
    exports: [ DBProvider ]
  })
export class InfraProvidersModule {}