FROM node:16-alpine
COPY package*.json ./
RUN yarn install --prod
COPY ./prisma/* ./prisma/
RUN apk add so:libssl.so.1.1
COPY . .
EXPOSE 8080
CMD [ "node", "dist/main.js"]