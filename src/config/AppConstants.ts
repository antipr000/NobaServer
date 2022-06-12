//storing constants at one place so that all the app-clients can use these same constants to implement constraints on client side for better user experience
export const APP_CONSTANTS = {
  AWS_SECRET_ACCESS_KEY_ATTR: "awsSecretAccessKey",
  AWS_ACCESS_KEY_ID_ATTR: "awsSecretKeyID",

  //this is for converting joi to swagger schema with named schema, put this in meta of joiSchema, https://www.npmjs.com/package/joi-to-swagger
  //value of this should match with javascript/typescript class name as j2s will create schema for this name and swagger-plugin(nest-cli.json) will use those named schemas at the places where the 'className' type is referred
  JOI_API_CLASS: "className",
};
