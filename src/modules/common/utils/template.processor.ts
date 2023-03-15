import Handlebars from "handlebars";
import puppeteer, { Browser } from "puppeteer";
import { S3Service } from "../s3.service";
import { Logger } from "winston";

export enum TemplateFormat {
  PDF = "pdf",
  HTML = "html",
}

export class TemplateLocale extends Intl.Locale {
  static readonly ENGLISH = new TemplateLocale("en-US");
  static readonly SPANISH = new TemplateLocale("es-CO");

  constructor(locale: string) {
    super(locale);
  }
}

export class TemplateProcessor {
  private readonly logger: Logger;
  private readonly s3Service: S3Service;
  readonly templatePath: string;
  readonly templateFilename: string;
  readonly savePath: string;
  readonly saveBaseFilename: string;
  formats: TemplateFormat[] = new Array();
  locales: TemplateLocale[] = new Array();
  private browser: Browser;

  // Strings indexed by locale
  unpopulatedTemplates: Map<TemplateLocale, string> = new Map();
  private populatedTemplates: Map<TemplateLocale, string> = new Map();

  constructor(
    logger: Logger,
    s3Service: S3Service,
    templatePath: string,
    templateBasename: string,
    savePath: string,
    saveBaseFilename: string,
  ) {
    this.logger = logger;
    this.s3Service = s3Service;
    this.templatePath = templatePath;
    this.templateFilename = templateBasename;
    this.savePath = savePath;
    this.saveBaseFilename = saveBaseFilename;
  }

  public addFormat(format: TemplateFormat) {
    this.formats.push(format);
  }

  public addLocale(locale: TemplateLocale) {
    this.locales.push(locale);
  }

  private async initialize() {
    const start = Date.now();
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--headless"],
        executablePath:
          process.platform === "win32"
            ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
            : "/usr/bin/chromium-browser",
      });
    }
    this.writeTimingLog(`Browser initialized`, Date.now() - start);
  }

  public async loadTemplates() {
    await this.initialize();
    const start = Date.now();
    for (const locale of this.locales) {
      let filename = this.templateFilename;
      if (filename.indexOf("LOCALE") > -1) filename = filename.replace("LOCALE", locale.language);
      const template = await this.s3Service.loadFromS3(this.templatePath, filename);
      if (!template) {
        throw new Error(`Template not found for locale ${locale}`);
      }

      this.unpopulatedTemplates.set(locale, template);
    }
    this.writeTimingLog(`Templates loaded`, Date.now() - start);
  }

  public populateTemplate(locale: TemplateLocale, data: any) {
    const start = Date.now();
    const unpopulatedTemplate = this.unpopulatedTemplates.get(locale);
    if (!unpopulatedTemplate) {
      throw new Error(`Template not found for locale ${locale}`);
    }

    const template = Handlebars.compile(unpopulatedTemplate);
    const populatedTemplate = template(data);
    this.populatedTemplates.set(locale, populatedTemplate);
    this.writeTimingLog(`Template populated for locale ${locale}`, Date.now() - start);
  }

  public async uploadPopulatedTemplates() {
    // For each locale and format, save the populated template
    for (const locale of this.locales) {
      const populatedTemplate = this.populatedTemplates.get(locale);
      if (populatedTemplate) {
        if (this.formats.includes(TemplateFormat.HTML)) {
          const start = Date.now();
          this.s3Service.uploadToS3(
            this.savePath,
            `${this.saveBaseFilename}_${locale.language}.${TemplateFormat.HTML}`,
            populatedTemplate,
          );
          this.writeTimingLog(`HTML template for ${locale.language} uploaded`, Date.now() - start);
        }

        if (this.formats.includes(TemplateFormat.PDF)) {
          const pdf = await this.convertToPDF(populatedTemplate, `${this.templateFilename}.${TemplateFormat.PDF}`);
          const start = Date.now();
          this.s3Service.uploadToS3(
            this.savePath,
            `${this.saveBaseFilename}_${locale.language}.${TemplateFormat.PDF}`,
            pdf,
          );
          this.writeTimingLog(`PDF template for ${locale.language} uploaded`, Date.now() - start);
        }
      }
    }
  }

  private async convertToPDF(html: string, filename: string): Promise<Buffer> {
    const start = Date.now();
    const page = await this.browser.newPage();
    await page.emulateMediaType("screen");
    await page.setContent(html);
    await page.evaluateHandle("document.fonts.ready");
    const pdf = page.pdf({
      format: "A4",
      margin: { bottom: "50px", top: "50px", left: "50px", right: "50px" },
    });
    this.writeTimingLog("PDF generated", Date.now() - start);
    return pdf;
  }

  public async destroy() {
    const start = Date.now();
    if (this.browser) await this.browser.close();
    this.writeTimingLog("Browser destroyed", Date.now() - start);
  }

  private writeTimingLog(message: string, duration: number) {
    this.logger.info(`TemplateProcessor: ${message} in ${duration}ms`);
  }
}
