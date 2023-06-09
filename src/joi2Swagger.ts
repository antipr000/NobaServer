import { ComponentsObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { AnySchema } from "joi";
import j2s, { ComponentsSchema } from "joi-to-swagger";

export function joiToSwagger(existingComponents: ComponentsObject): ComponentsObject {
  let mergedSchemas: ComponentsSchema = { ...existingComponents };

  // Because getJoiSchemas() always returns an empty array, mergedSchemas will always be the same as existingComponents
  getJoiSchemas().forEach(joiSchema => {
    const resp = j2s(joiSchema);
    mergedSchemas = mergeSchemas(mergedSchemas, resp.components);
  });

  delete mergedSchemas.schemas[""];
  return mergedSchemas;
}

function mergeSchemas(existingComponents: ComponentsSchema, newComponents: ComponentsSchema): ComponentsSchema {
  //new components override existing components
  const newSchemas = { ...existingComponents.schemas, ...newComponents?.schemas };
  return { ...existingComponents, schemas: newSchemas };
}

//for these schemas which are not DTOs but are used in DTOs, we need to create a separate schema for them from their joi schema so that they can be referred in swagger api-spec
function getJoiSchemas(): AnySchema[] {
  return [];
}
