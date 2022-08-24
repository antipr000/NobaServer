## About

Noba server-side code.

## Development setup

- Clone this repository using `git clone https://github.com/nobapay/NobaServer.git`
- Install the dependencies using `yarn install`
- Start the localhost using `yarn dev`. The project starts in `localhost:8080`
- We strongly recommend you to use Visual Studio Code (VS Code) for development purposes

### VS Code Extensions

- Install [Format Code Action](https://marketplace.visualstudio.com/items?itemName=rohit-gohri.format-code-action) extension
- Install [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) extension
- Install [Coverage Gutters](https://marketplace.visualstudio.com/items?itemName=ryanluker.vscode-coverage-gutters) extension

## Deployment/Release Instructions

See also: [AWS Environments](https://www.notion.so/onenoba/Noba-AWS-Environment-7728839e49f349aaa5a41c124c19ab06)

##### Production Environment (api.noba.com/v1/health)

- To create production release (deployment) create a tag with syntax like v0.0.1 (see previous release to find new version), deployment logs are available [here]().

##### Staging Environment (api-staging.noba.com/v1/health)

- We have github actions setup that will automatically deploy changes in the staging instance when tags with suffix -staging are created. 
##### Partner Environment (api-partner.noba.com/v1/health)

- We have github actions setup that will automatically deploy changes in the partner instance when tags with suffix -parter are created.

##### Dev Environment (api-dev.noba.com/v1/health)

- Any time code is pushed to the `main` branch, the dev environment will be updated.

##### Sandbox Environment (api-sandbox.noba.com/v1/health)

There are two options to get a build into this environment:

1. Put the 'deploy-sandbox' label on the pull request to deploy to this environment
2. Run the ./deployscripts/aws-sandbox-deploy.sh command in your local repository to deploy the current branch to the sandbox environment. Make sure you commit your local changes in the local branch first. This command basically pushes the current branch to the 'sandbox' tag and from there github action deploys to AWS 'sandbox' Deployment group.

- Sometimes multiple developers may be trying to test their changes in AWS Dev environment so you may not see your changes deployed as they may be overridden by other developers so coordination is sometimes needed.
- You can directly create the 'sandbox' tag from your branch in github UI to deploy to aws deployment environment.

#### Notes
- Check Github Actions to find the progress of build and deployment progress [here](https://github.com/nobapay/NobaServer/actions)
- You can find documentation about our deployment process and environments [here](https://www.notion.so/onenoba/Noba-AWS-Environment-7728839e49f349aaa5a41c124c19ab06).

## Server Runtime Deployment High-level Overview

**TODO: Rewrite for elastic beanstalk**

- Github actions create artifacts and upload to S3 and creates a AWS CodeDeploy deployment for a DeploymentGroup based on the type of deployment dev/staging/production see ./github/workflows/main.yml
- Server is run on a group of EC2s and the enpoints are exposed to public through API Gateway
- We have 3 stages in API Gateway for NobaServer
  - dev : (api-dev.noba.com/v1/health)
  - staging: (api-staging.noba.com/v1/health)
  - production: (api.noba.com/v1/health)
- mapping of api gateway and noba domain is doen through generating Certificates in AWS Certificate Manager and verifying them in Google Domains and then finally mapping the verified domain with a API Gateway Staging in 'Custom Domains' section and then adding one more entry in Google Domain DNS section for cloudfront url CNAME (2 DNS record for each API Gateway mapping)

## Things to keep in mind

- When you add / remove APIs (i.e make changes in any controller file) make sure to get the swagger updated by starting the server atleast once after the changes are done. Command: `yarn dev`
- Eslint and Prettier configurations have been added and configured in VS Code. To make them work, install the extensions mentioned above.
- Although eslint and prettier are configured to run on save, it's always better to run both of them before commiting your changes. You can run using:

```
npx prettier --write src/
npx eslint --fix src/
```

Also make sure to run prettier first and then eslint.

## Testing

- Be sure to add unit and integration tests for all of your changes. You can find best practices around writing tests [here](https://www.notion.so/onenoba/Best-Practices-on-Testing-a29dc328521d481bba97ae4f268aa37a).
- Make sure your changes are not breaking any existing tests. If it's intended to break, make sure to update the tests accordingly. Also before commiting your changes run all tests once using: `yarn test`
- Follow best coding practices while writing code. You can find some examples around best practices in [this]() document.

### Viewing Test Coverage in VS Code
Being able to view test coverage within VS Code is extremely important as you update code and write new tests so you have instant local feedback on the effectiveness of your tests. We are striving for at least 90% coverage across the entire codebase, so any new tests should cover 90%+ of the code within the scope of that test.
To view coverage within VS Code:
1. Ensure you have installed the Coverage Gutters extension as referenced above.
2. With this extension installed, you will have a new option in the bottom bar in VS Code that says "Watch". Click on that.
3. Run tests with `yarn test:cov` to collect coverage information during a test run.

Now open the code that you are intendeding to test and you'll find coverage information shown in the left gutter next to each line. The red areas need tests added to cover the missing scenarios.
