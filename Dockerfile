FROM node:16
COPY package*.json ./
COPY prisma/* ./prisma
COPY node_modules/@prisma/client/* ./node_modules/@prisma/client/*
RUN yarn install --prod
RUN yarn prisma-migrate-deploy
COPY . .
EXPOSE 8080
CMD [ "node", "dist/main.js"]