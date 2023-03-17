import { Browser, Page, ElementHandle } from "puppeteer";

export const stubPuppeteer = {
  launch() {
    return Promise.resolve(stubBrowser);
  },
} as unknown as any;

export const newPageFn = jest.fn().mockImplementation(() => Promise.resolve(stubPage));

export const stubBrowser = {
  newPage: newPageFn,
  close() {
    return Promise.resolve();
  },
} as unknown as Browser;

export const stubPage = {
  goto(url: string) {
    return Promise.resolve();
  },
  $$(selector: string): Promise<ElementHandle[]> {
    return Promise.resolve([]);
  },
  $(selector: string) {
    return Promise.resolve(stubElementHandle);
  },
  $eval(selector: string, pageFunction: any) {
    return Promise.resolve();
  },
} as unknown as Page;

export const stubElementHandle = {
  $eval() {
    return Promise.resolve();
  },
} as unknown as ElementHandle;
