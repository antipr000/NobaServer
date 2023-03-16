jest.mock("puppeteer", () => ({
  launch() {
    return stubBrowser;
  },
}));

import { anything, instance, when } from "ts-mockito";
import winston, { Logger } from "winston";
import { stubBrowser, stubPage, stubElementHandle, stubPuppeteer } from "../mocks/mock.puppeteer";
import { getMockS3ServiceWithDefaults } from "../mocks/mock.s3.service";
import { S3Service } from "../s3.service";
import { TemplateFormat, TemplateLocale, TemplateProcessor } from "../utils/template.processor";

describe("TemplateProcessor", () => {
  let templateProcessor: TemplateProcessor;
  let s3Service: S3Service;
  let logger: Logger;

  jest.setTimeout(30000);

  beforeEach(async () => {
    s3Service = getMockS3ServiceWithDefaults();
    logger = winston.createLogger({ transports: [new winston.transports.Console()] });

    const s3Instance = instance(s3Service);
    templateProcessor = new TemplateProcessor(logger, s3Instance, "test", "test", "test", "test");
  });

  afterAll(async () => {});

  describe("addFormat", () => {
    it("should push formats", async () => {
      templateProcessor.addFormat(TemplateFormat.PDF);
      templateProcessor.addFormat(TemplateFormat.HTML);
      expect(templateProcessor.formats).toEqual(new Set([TemplateFormat.PDF, TemplateFormat.HTML]));
    });

    it("should not push duplicate formats", async () => {
      templateProcessor.addFormat(TemplateFormat.PDF);
      templateProcessor.addFormat(TemplateFormat.PDF);
      expect(templateProcessor.formats).toEqual(new Set([TemplateFormat.PDF]));
    });

    it("should not null or undefined formats", async () => {
      templateProcessor.addFormat(null);
      templateProcessor.addFormat(undefined);
      expect(templateProcessor.formats).toEqual(new Set());
    });
  });

  describe("addLocale", () => {
    it("should push locales", async () => {
      templateProcessor.addLocale(TemplateLocale.ENGLISH);
      templateProcessor.addLocale(TemplateLocale.SPANISH);
      expect(templateProcessor.locales).toEqual(new Set([TemplateLocale.ENGLISH, TemplateLocale.SPANISH]));
    });

    it("should not push duplicate locales", async () => {
      templateProcessor.addLocale(TemplateLocale.ENGLISH);
      templateProcessor.addLocale(TemplateLocale.ENGLISH);
      expect(templateProcessor.locales).toEqual(new Set([TemplateLocale.ENGLISH]));
    });

    it("should not null or undefined locales", async () => {
      templateProcessor.addLocale(null);
      templateProcessor.addLocale(undefined);
      expect(templateProcessor.locales).toEqual(new Set());
    });
  });
});
