import { EmailRequest } from "../domain/EmailTypes";

export interface EmailService {
  sendEmail(request: EmailRequest): Promise<void>;
}
