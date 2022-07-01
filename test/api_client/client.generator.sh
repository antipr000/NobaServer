#!/usr/bin/bash

# We have made some custom changes in core after initial generation so we shouldn't generate the core modules again and only new models and api methods
echo "Processing api.json using openapi CLI tool..."
npx openapi-typescript-codegen --input ./swagger-internal.json --output ./test/api_client/ --useUnionTypes --exportCore false -c axios   

echo "... finished generating OpenAPI specs from Noba Server."