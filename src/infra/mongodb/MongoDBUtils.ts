export function convertDBResponseToJsObject(response: any): any {
  return JSON.parse(JSON.stringify(response));
}
