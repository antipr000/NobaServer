FROM node:16
COPY package*.json ./
RUN yarn install --prod
RUN yarn prisma-migrate-deploy
COPY . .
EXPOSE 8080
CMD [ "node", "dist/main.js"]