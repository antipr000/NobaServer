import { EmailRequest } from "../domain/EmailTypes";

export interface EmailClient {
  sendEmail(request: EmailRequest): Promise<void>;
}
