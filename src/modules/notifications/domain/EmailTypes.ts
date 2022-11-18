export type EmailRequest = {
  to: string;
  from: string;
  templateId: string;
  dynamicTemplateData: object;
};
