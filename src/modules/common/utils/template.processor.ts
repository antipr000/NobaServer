import { existsSync } from "fs";
import Handlebars from "handlebars";
import puppeteer, { Browser } from "puppeteer";
import { S3Service } from "../s3.service";
import { Logger } from "winston";

export enum TemplateFormat {
  PDF = "pdf",
  HTML = "html",
}

export interface FooterTemplate {
  left: string;
  center: string;
  right: string;
}

export interface FooterLabels {
  left: string;
  center: string;
  right: string; // Always page
}

export interface FooterData {
  left: string;
  center: string;
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
  formats: Set<TemplateFormat> = new Set();
  locales: Map<TemplateLocale, FooterLabels> = new Map();
  private browser: Browser;

  // Strings indexed by locale
  unpopulatedTemplates: Map<TemplateLocale, string> = new Map();
  populatedTemplates: Map<TemplateLocale, string> = new Map();

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
    if (!format) return;
    this.formats.add(format);
  }

  public addLocale(locale: TemplateLocale, footerLabels?: FooterLabels) {
    if (!locale) return;
    this.locales.set(locale, footerLabels);
  }

  private async initialize() {
    const start = Date.now();
    this.browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--headless"],
      executablePath: this.findChrome(this.chromePaths),
    });
    this.writeTimingLog(`Browser initialized`, Date.now() - start);
  }

  public async loadTemplates() {
    if (!this.browser) await this.initialize();
    const start = Date.now();
    for (const [locale] of this.locales) {
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

  public async uploadPopulatedTemplates(footerData: Map<TemplateLocale, FooterData>) {
    // For each locale and format, save the populated template
    for (const [locale] of this.locales) {
      const populatedTemplate = this.populatedTemplates.get(locale);

      if (populatedTemplate) {
        if (this.formats.has(TemplateFormat.HTML)) {
          const start = Date.now();

          this.s3Service.uploadToS3(
            this.savePath,
            `${this.saveBaseFilename}_${locale.language}.${TemplateFormat.HTML}`,
            populatedTemplate,
          );
          this.writeTimingLog(`HTML template for ${locale.language} uploaded`, Date.now() - start);
        }

        if (this.formats.has(TemplateFormat.PDF)) {
          if (!this.browser) await this.initialize();
          const pdf = await this.convertToPDF(
            populatedTemplate,
            `${this.templateFilename}.${TemplateFormat.PDF}`,
            this.createFooterTemplate(locale, footerData),
          );
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

  private createFooterTemplate(locale: TemplateLocale, footerData: Map<TemplateLocale, FooterData>): FooterTemplate {
    const labels = this.locales.get(locale);
    const localizedFooterData = footerData.get(locale);

    return {
      left: `${labels.left} ${localizedFooterData.left}`,
      center: `${labels.center} ${localizedFooterData.center}`,
      right: `${labels.right}&nbsp;<span class="pageNumber" style=""></span>/<span class="totalPages"></span>`,
    };
  }

  private async convertToPDF(html: string, filename: string, footerData: FooterTemplate): Promise<Buffer> {
    const start = Date.now();
    const page = await this.browser.newPage();
    await page.emulateMediaType("screen");
    await page.setContent(html);
    await page.evaluateHandle("document.fonts.ready");
    const pdf = page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
          <div style="font-family: system-ui; margin-left: 30px; margin-right: 30px; display: flex; font-size: 8px; width: 100%;">
            <div style="flex: 1; display:flex; justify-content:left;"><span>${footerData.left}</span></div>
            <div style="flex: 1; display:flex; justify-content:center;"><span>${footerData.center}</span></div>
            <div style="flex: 1; display:flex; justify-content:right;">${footerData.right}</div>
          </div>
          `,
      margin: { bottom: "80px", top: "80px", left: "50px", right: "50px" },
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

  private chromePaths: string[] = [
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/chromium-browser",
  ];
  private findChrome(files: string[]): string {
    for (let file of files) {
      if (existsSync(file)) {
        return file;
      }
    }
    return null;
  }
}
