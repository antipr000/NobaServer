import { anything, mock, when } from "ts-mockito";
import { EmailClient } from "../emails/email.client";
import { SendgridEmailClient } from "../emails/sendgrid.email.client";

export const getMockEmailClientWithDefaults = () => {
  const mockEmailService: EmailClient = mock(SendgridEmailClient);

  when(mockEmailService.sendEmail(anything())).thenReject(new Error("Not implemented!"));
  return mockEmailService;
};
