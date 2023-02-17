FROM node:16-alpine
COPY package*.json ./
COPY .env ./
RUN yarn install --prod
COPY ./prisma/ ./prisma/
RUN apk add so:libssl.so.1.1
RUN yarn prisma-migrate-deploy
RUN yarn prisma db seed
COPY . .
ENV HTTP_PROXY="http://172.31.8.170:3128"
ENV HTTPS_PROXY="https://172.31.8.170:3129"
EXPOSE 8080
CMD [ "node", "dist/main.js"]