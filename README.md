### About

Noba server side code.

### Development setup

- Clone this repository using `git clone https://github.com/nobapay/NobaServer.git`
- Install the dependencies using `yarn install`
- Start the localhost using `yarn run start:dev`. The project starts in `localhost:8080`
- We strongly recommend you to use VSCode for development purposes

### VSCode Configurations

- Install [Format Code Action](https://marketplace.visualstudio.com/items?itemName=rohit-gohri.format-code-action) extension
- Install [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) extension

### Deployment/Release Instructions

#### Production Environment (api.noba.com/v1/health)

- To create production release (deployment) create a tag with syntax like v0.0.1 (see previous release to find new version), deployment logs are available [here]().

#### Staging Environment (api-staging.noba.com/v1/health)

- We have github actions setup that will automatically deploy changes in staging instance when tags with suffix -staging are created.

#### Dev Environment (api-dev.noba.com/v1/health)

We have github actions setup that will automatically deploy changes in staging instance whenever chagnes are pushed to the main branch.

#### AWS Sandbox Environment (api-sandbox.noba.com/v1/health)

- either put 'deploy-sandbox' label on the pull request to deploy to this environment
- or run ./aws-sandbox-deploy command in your local repository to deploy current branch to sandbox environment. Make sure you commit your local changes in local branch first. This command basically pushes current branch to 'dev' tag and from there github action deploys to AWS 'Dev' Deployment group.
- Sometimes multiple developers may be trying to test their changes in AWS Dev environment so you may not see your changes deployed as they may be overridden by other developers so coordination is needed sometimes
- you can directly create 'dev' tag from your branch in github ui to deploy to aws deployment environment

##### Notes

- Check Github Actions to find the progress of build and deployment progress [here](https://github.com/nobapay/NobaServer/actions)
- You can find documentation about our deployment process [here](TODO add notion documentation).

### Server Runtime Deployment Highlevel Overview

- Github actions create artifacts and upload to S3 and creates a AWS CodeDeploy deployment for a DeploymentGroup based on the type of deployment dev/staging/production see ./github/workflows/main.yml
- Server is run on a group of EC2s and the enpoints are exposed to public through API Gateway
- We have 3 stages in API Gateway for NobaServer
  - dev : (api-dev.noba.com/v1/health)
  - staging: (api-staging.noba.com/v1/health)
  - production: (api.noba.com/v1/health)
- mapping of api gateway and noba domain is doen through generating Certificates in AWS Certificate Manager and verifying them in Google Domains and then finally mapping the verified domain with a API Gateway Staging in 'Custom Domains' section and then adding one more entry in Google Domain DNS section for cloudfront url CNAME (2 DNS record for each API Gateway mapping)

### Things to keep in mind

- When you add / remove APIs (i.e make changes in any controller file) make sure to get the swagger updated by starting the server atleast once after the changes are done. Command: `yarn run start:dev`
- Eslint and Prettier has configurations has been added and also configurations of them with VSCode has been added. To make them work make sure to install the extensions mentioned above.
- Although eslint and prettier are configured to run on save, it's always better to run both of them before commiting your changes. You can run using:

```
npx prettier --write src/
npx eslint --fix src/
```

Also make sure to run prettier first and then eslint.

- Make sure to add unit and integration tests for your changes. You can find best practices around writing tests [here](https://www.notion.so/onenoba/Best-Practices-on-Testing-a29dc328521d481bba97ae4f268aa37a).
- Make sure your changes are not breaking any existing tests. If it's intended to break, make sure to update the tests accordingly. Also before commiting your changes run all tests once using: `yarn run test`
- Follow best coding practices while writing code. You can find some examples around best practices in [this]() document.
