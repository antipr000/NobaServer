import { anything, mock, when } from "ts-mockito";
import { EmailService } from "../emails/email.service";
import { SendgridEmailService } from "../emails/sendgrid.email.service";

export const getMockEmailServiceWithDefaults = () => {
  const mockEmailService: EmailService = mock(SendgridEmailService);

  when(mockEmailService.sendEmail(anything())).thenReject(new Error("Not implemented!"));
  return mockEmailService;
};
