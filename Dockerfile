FROM node:16
COPY package*.json ./
RUN yarn install --prod
COPY . .
EXPOSE 8080
CMD [ "node", "dist/main.js"]

