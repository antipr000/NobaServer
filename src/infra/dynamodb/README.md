General debugging advice:
* Check Table definition 
* Check Model definition and GSIs definition
* Check Mappers
* Check Repo code


We are using https://github.com/awslabs/dynamodb-data-mapper-js for Object-DB mapping for dynamodb


see their npm documentation to understand the usage. This file explains it all i.e. what happens under the hood  https://github.com/awslabs/dynamodb-data-mapper-js/blob/master/packages/dynamodb-data-mapper/src/DataMapper.ts 

type "Any" in schema is marshalled as object in data-mapper i.e. get all the keys of the given object and marshall the values corresponding to the keys recursively
with javascript plain objects and classes we can use "Any" type and data-mapper will convert it to map(which DDB supports)

Only attributes which will be stored in the DB are the ones which are defined the schema, i.e. an object can have 1000 attributes/fields but only those will be saved in DB which are defined in schema, this is helpful as we don't have to filter user defined attributes(bad requests) at javascript runtime as we won't touch them either in code nor in db  

Common Errors:
    * UnRecognized schema node : in schema you probably defined key type as 'number' instead of 'Number' 

    *The conditional request failed: 
        1. when updating an item with stale version number 
        2. when creating a new item when one item with same partitionKey and sortKey already exists
