jest.mock("puppeteer", () => ({
  launch() {
    return stubBrowser;
  },
}));

import { instance, when } from "ts-mockito";
import winston, { Logger } from "winston";
import { stubBrowser, stubPage, stubElementHandle, stubPuppeteer, newPageFn } from "../mocks/mock.puppeteer";
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
    templateProcessor = new TemplateProcessor(
      logger,
      s3Instance,
      "templatePath",
      "template_LOCALE_filename",
      "savePath",
      "saveBaseFilename",
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
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

  describe("loadTemplates", () => {
    it("should load templates", async () => {
      templateProcessor.addLocale(TemplateLocale.ENGLISH);
      templateProcessor.addLocale(TemplateLocale.SPANISH);
      when(s3Service.loadFromS3("templatePath", "template_en_filename")).thenResolve("test-template-en");
      when(s3Service.loadFromS3("templatePath", "template_es_filename")).thenResolve("test-template-es");
      await templateProcessor.loadTemplates();
      expect(templateProcessor.unpopulatedTemplates.size).toBe(2);
      expect(templateProcessor.unpopulatedTemplates.get(TemplateLocale.ENGLISH)).toBe("test-template-en");
      expect(templateProcessor.unpopulatedTemplates.get(TemplateLocale.SPANISH)).toBe("test-template-es");
    });

    it("should not load templates if no locales", async () => {
      await templateProcessor.loadTemplates();
      expect(templateProcessor.unpopulatedTemplates.size).toBe(0);
    });

    it("should throw Error if templates not found in S3", async () => {
      templateProcessor.addLocale(TemplateLocale.ENGLISH);
      templateProcessor.addLocale(TemplateLocale.SPANISH);
      when(s3Service.loadFromS3("templatePath", "template_en_filename")).thenResolve(null);
      when(s3Service.loadFromS3("templatePath", "template_es_filename")).thenResolve(null);
      expect(templateProcessor.loadTemplates()).rejects.toThrowError();
      expect(templateProcessor.unpopulatedTemplates.size).toBe(0);
    });
  });

  describe("populateTemplates", () => {
    it("should throw Error is unpopulated template is not found", async () => {
      expect(() =>
        templateProcessor.populateTemplate(TemplateLocale.SPANISH, { first: "firstName", last: "lastName" }),
      ).toThrowError();
    });

    it("should throw Error is unpopulated template is not found", async () => {
      templateProcessor.addLocale(TemplateLocale.SPANISH);
      templateProcessor.unpopulatedTemplates.set(TemplateLocale.SPANISH, "{{first}}-{{last}}");
      await templateProcessor.populateTemplate(TemplateLocale.SPANISH, { first: "firstName", last: "lastName" });
      expect(templateProcessor.populatedTemplates.get(TemplateLocale.SPANISH)).toEqual("firstName-lastName");
    });
  });

  describe("uploadPopulatedTemplates", () => {
    it("should upload HTML populated templates", async () => {
      templateProcessor.addLocale(TemplateLocale.SPANISH);
      templateProcessor.addFormat(TemplateFormat.HTML);
      const populatedTemplate = "firstName-lastName";
      templateProcessor.populatedTemplates.set(TemplateLocale.SPANISH, "firstName-lastName");
      when(s3Service.uploadToS3("savePath", `saveBaseFilename_es.html`, populatedTemplate)).thenResolve();
      await templateProcessor.uploadPopulatedTemplates(
        new Map([
          [
            TemplateLocale.SPANISH,
            {
              center: "center",
              left: "left",
              right: "right",
            },
          ],
        ]),
      );
    });

    it("should upload PDF populated templates", async () => {
      templateProcessor.addLocale(TemplateLocale.SPANISH);
      templateProcessor.addFormat(TemplateFormat.PDF);
      templateProcessor.populatedTemplates.set(TemplateLocale.SPANISH, "pdf-content");
      when(s3Service.uploadToS3("savePath", `saveBaseFilename_es.pdf`, "pdf-content")).thenResolve();
      await templateProcessor.uploadPopulatedTemplates(
        new Map([
          [
            TemplateLocale.SPANISH,
            {
              center: "center",
              left: "left",
              right: "right",
            },
          ],
        ]),
      );
      expect(newPageFn).toHaveBeenCalled();
    });

    it("should not upload populated templates if no populated templates", async () => {
      const s3UploadSpy = jest.spyOn(s3Service, "uploadToS3");
      await templateProcessor.uploadPopulatedTemplates(new Map());
      expect(s3UploadSpy).not.toHaveBeenCalled();
    });

    it("should not upload populated templates if no locales", async () => {
      const s3UploadSpy = jest.spyOn(s3Service, "uploadToS3");
      templateProcessor.addFormat(TemplateFormat.HTML);
      await templateProcessor.uploadPopulatedTemplates(new Map());
      expect(s3UploadSpy).not.toHaveBeenCalled();
    });

    it("should not upload populated templates if no formats", async () => {
      const s3UploadSpy = jest.spyOn(s3Service, "uploadToS3");
      templateProcessor.addLocale(TemplateLocale.SPANISH);
      await templateProcessor.uploadPopulatedTemplates(new Map());
      expect(s3UploadSpy).not.toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("should close browser", async () => {
      templateProcessor.loadTemplates();
      await templateProcessor.destroy();
    });

    it("should not close browser if not loaded", async () => {
      await templateProcessor.destroy();
    });
  });
});
