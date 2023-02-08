# FROM --platform=linux/amd64 node:16
# env NODE_ENV=e2e_test
# env DATABASE_URL=postgresql://e2e_user:pass@localhost:5432/Noba_E2E
# COPY package*.json ./
# RUN yarn install --prod
# COPY ./prisma/ ./prisma/
# RUN apk update && apk add bash
# RUN npm i -g @nestjs/cli
# RUN yarn prisma generate
# RUN 
# # RUN apk add so:libssl.so.1.1
# # RUN yarn prisma-migrate-deploy
# # RUN yarn prisma db seed
# COPY . .
# EXPOSE 8080
# CMD [ "yarn", "start"]


FROM node:16-alpine

env NODE_ENV=e2e_test
env DATABASE_URL=postgresql://e2e_user:pass@postgres-db:5432/Noba_E2E

RUN apk update && apk add bash

COPY . .
EXPOSE 8080

RUN yarn install
RUN yarn prisma-generate
RUN yarn build

CMD [ "node", "dist/main.js"]