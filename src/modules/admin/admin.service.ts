import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";




@Injectable()
export class AdminService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

}
