import { readFileSync } from "fs-extra";
import yaml from "js-yaml";

export function readHTMLTemplateFromHandlebarFiles(...filesPaths: string[]) {
  const configs: any = {};
  for (const filePath of filesPaths) {
    const fileContent = readFileSync(filePath, "utf8");
  }
  return configs;
}
