import { readFileSync } from "fs-extra";
import yaml from "js-yaml";

export function readConfigsFromYamlFiles(...filesPaths: string[]) {
  const configs: any = {};
  for (const filePath of filesPaths) {
    const fileContent = readFileSync(filePath, "utf8");
    const fileConfigs = yaml.load(fileContent);
    mergeDeep(configs, fileConfigs);
  }
  return configs;
}

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}
