### About
Noba server side code.

### One time setup
- install git for windows
- checkout code using git clone URL_OF_THE_REPO
- run this command in root of the repository `git config --global push.default current`
- install nodejs 14.15.0
- install yarn by (npm install -g yarn) 
- Install Docker Desktop for Windows first (windows reboot required); wsl2 required 

### Running the code (includes running localstack for local dynamodb setup, first setup docker desktop on your machine, google search how to setup Docker on YOUR_OS_HERE)
- run --> yarn install   (in root of project directory)
## Setting up Dynamodb (ignore this for now, we will setup a common shared dev instance)
- docker run --rm -v "C:\Users\${REPLACE_WITH_YOUR_WINDOWS_USERNAME_HERE}\localstack\data":"/tmp/localstack/data" -e "DATA_DIR=/tmp/localstack/data" -p 4566:4566 localstack/localstack
- create dynamodb tables: In the root of the project run `npx ts-node src\infra\dynamodb\scripts\createddbtables.ts` in git bash 
- git bash(in new terminal):  `export AWS_SECRET_ACCESS_KEY=test && export AWS_ACCESS_KEY_ID=test && export AWS_REGION=ap-southeast-1 && export DYNAMO_ENDPOINT=http://localhost:4566 && npx dynamodb-admin`  (uses dynamodb-admin nmp package, ddb admin can be accessed on this http://localhost:8001/)
- git bash(in new terminal): yarn start:dev
- To create tables `npx ts-node src/infra/dynamodb/scripts/createddbtables.ts`

#### Running NobaServer
- yarn start:dev 
- swagger-ui => http://localhost:8080/swagger-ui/
- swagger-json => http://localhost:8080/swagger-ui-json

Refer [here](https://github.com/nobapay/NobaServer/blob/master/CodingPractices.md) for coding practices.

### Development Guide
(While making any change, backward compatibility (previous stored data in database) should be the most important thing to keep in mind, else all users get impacted!)
Don't change attribute names in classes/joischema etc. as we put them as they are in database, we could separate the db schema from object schema through mappers but it will take a lot of time to individually map each object attribute with db model attribute


#### VSCode Guide
* ctrl+p search file
* ctrl+f find in file
* ctrl+shift+f find globally
* ctrl+shift+p open vs code console
* ctrl+click on a variable, method, class to find its usage

#### git guide
* Never work on master branch! never!! 
* Install git 
* Install git lens vscode extension
* [Optional] Use Github Copilot extension(highly recommended), TODO check with Gal if any privacy concerns etc? though shouldn't be an issue as github copilot hopefully won't steal the code. 
* for each new feature create a new branch, run `git fetch && git checkout -b NEW_BRANCH_NAME_HERE origin/master`, before creating new branch make sure you have committed code in current (old) branch
* add/commit/push files using git (VCS) icon in vscode or use git bash cli if you are familiar with it already (recommended)
* learn `git stash` 
#### Typescript Guide
* const z = x ?? y; means z points to x if x exists (not undefined or null) else it points to y, which is same as writing z = x ? x: y; 
* don't use 'any' type 

#### Documenting the code
* document whatever you have done properly somewhere, update related READMEs, code comments, create READMEs if needed. 
#### Never do these!
* Never make any joi schema attributes as required if it was optional earlier 
* If adding any joi schema attribute to an existing model don't make it required as previous saved objects in the db won't comply the new schema and hence impacting all users!


#### Good practices
* Boy scout rule -> leave the code cleaner than before you touched
* Avoid making code complex, Keep it Simple & Stupid (KISS principle)!
* If having any difficulty understanding the code, feel free to reach out to leads. 
* Test properly before submitting a pull request, attach some test evidence in the pull request
* Self review pull request once
* Don't catch the failures, if catching then raise alert and/or throw further in the chain

#### While reviewing code
* Make sure that await keyword is used wherever needed and we are not prematurely existing a controllers call allowing things to happen in backgroud!
* Do db write tasks things in transactions wherever possible
* Joi schema cannot have any more required fields if the schema was released once already in the production as previously saved objects won't comply
* Never log/print app configurations in production as it can leak secrets/passwords
* Avoid logging in production, only log unexpected events, put debug logs if code is complex, avoid making code complex


### How are configurations loaded? what is ConfigService?
ConfigService is a service available globally using Config module (by nestjs), see app.module.ts to know how it sources all the configuration properties.
We load configs from yaml files (in appConfig folder) in app.module.ts while registering config module.
See AppConfigurations.ts file to know how props are sourced from yaml files and some of them are merged with environments and secrets variables. 
Or in vscode ctrl+shift+f and search for `Application configurations loading logic here`

### Authentication and Authorization 
* See preauth.middelware.ts,  'user' attribute on http request object are details for authenticated user
* We use autorization based on the Roles specified on the endpoints. See roles.guard.ts and roles.decorator.ts


### Dynamodb Internal Docs
https://github.com/nobapay/NobaServer/blob/master/src/infra/dynamodb/README.md

### Errors
1. Error Description:-
    If you are getting error like this:
    ```
    Error: A circular dependency has been detected (propery key: "SomeKey").
    ```
    Error Resolution:- 
    1. Look for enum and apiproperty (in DTOs),
    2. Make sure no actual cyclic dependency

