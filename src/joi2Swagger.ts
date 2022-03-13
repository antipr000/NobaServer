import { AnySchema } from "joi";
import j2s, { ComponentsSchema } from 'joi-to-swagger';

export function joiToSwagger(existingComponents) {
    let mergedComponents = existingComponents;
    getJoiSchemas().forEach(joiSchema=>{
       const resp = j2s(joiSchema);
       mergedComponents = mergeComponents(mergedComponents,resp.components);
    });

    
    delete mergedComponents.schemas[""];

    // console.log(mergedComponents)

    return mergedComponents; 
}

function mergeComponents(existingComponents: ComponentsSchema, newComponents: ComponentsSchema) {
    //new components override existing components
    const newSchemas = {...existingComponents.schemas, ...newComponents?.schemas}
    return {...existingComponents, schemas: newSchemas}
}


//for these schemas which are not DTOs but are used in DTOs, we need to create a separate schema for them from their joi schema so that they can be referred in swagger api-spec
function getJoiSchemas() : AnySchema[]{
    return [
        
    ]
}
