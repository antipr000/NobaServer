FROM node:16-alpine
COPY package*.json ./
COPY .env ./
RUN yarn install --prod
#COPY ./prisma/* ./prisma/
RUN apk add so:libssl.so.1.1
RUN yarn prisma-generate
COPY . .
EXPOSE 8080
CMD [ "node", "dist/main.js"]