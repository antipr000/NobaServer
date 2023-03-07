import { Injectable } from "@nestjs/common";
import puppeteer, { Browser } from "puppeteer";

@Injectable()
export class PupperteerService {
  private readonly browser: Browser;

  constructor() {
    this.browser = await this.getBrowser();
  }

  private async getBrowser(): Promise<Browser> {
    return puppeteer.launch({
      headless: true,
      args: ['--js-flags="--max-old-space-size=1024"'],
    });
  }

  public async pushHandlebarLanguageFile(
    employerReferralID: string,
    filename: string,
    content: string | Buffer,
  ): Promise<void> {}

  public async closeBrowser(): Promise<void> {
    await this.puppeteer;
  }
}
