export function getRandomEmail(base: string): string {
  return `base.${Math.random()}@noba.com`;
}

export function getRandomID(base: string): string {
  return `base${Math.random()}`;
}
