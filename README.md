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

### Deploying to production
- We have github actions setup that will automatically deploy changes in production instances when pushed into master.
- You can find production logs [here]().
- You can find documentation about our deployment process [here]().

### Things to keep in mind
- When you add / remove APIs (i.e make changes in any controller file) make sure to get the swagger updated by starting the server atleast once after the changes are done. Command: `yarn run start:dev`
- Eslint and Prettier has configurations has been added and also configurations of them with VSCode has been added. To make them work make sure to install the extensions mentioned above.
- Although eslint and prettier are configured to run on save, it's always better to run both of them before commiting your changes. You can run using:
``` 
npx eslint --fix src/
npx prettier --write src/
```
- Make sure to add unit and integration tests for your changes. You can find best practices around writing tests [here](https://www.notion.so/onenoba/Best-Practices-on-Testing-a29dc328521d481bba97ae4f268aa37a).
- Make sure your changes are not breaking any existing tests. If it's intended to break, make sure to update the tests accordingly. Also before commiting your changes run all tests once using: `yarn run test`
- Follow best coding practices while writing code. You can find some examples around best practices in [this]() document.
