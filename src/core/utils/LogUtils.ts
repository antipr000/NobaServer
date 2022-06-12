export function logMeta(context: any | string, meta?: any, ...extraContextStrings: string[]): any {
  //context is printed by nest like winston formatter which part of nest-winston
  if (!meta) meta = {};
  if (!meta.context) {
    meta.context =
      typeof context == "string"
        ? context
        : context.constructor.name + extraContextStrings.map(x => x.trim()).join(".");
  }
  return meta;
}
