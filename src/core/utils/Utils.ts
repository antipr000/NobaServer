import { ItemNotFoundException } from "@aws/dynamodb-data-mapper";

export const HASH_SEPARATOR = "#"; //AttributeSeparator
export const DEFAULT_SEPARATOR = HASH_SEPARATOR;

export function mergeAttributes(...args: string[]): string {
  return args.join(HASH_SEPARATOR);
}

export function splitAttributes(str): string[] {
  return str.split(HASH_SEPARATOR);
}

export function isDynamoDBItemNotFoundException(ex) {
  return ex instanceof ItemNotFoundException || ex.name === "ItemNotFoundException";
}

export function trimAndRemoveNewLine(s: string): string {
  if (s) return s.trim().replace(/\r?\n|\r/g, " ");
  return s;
}

export function delay(delayTimeInMilliseconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, delayTimeInMilliseconds);
  });
}
