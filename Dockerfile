FROM node:16.19.0-alpine3.17
COPY package*.json ./
COPY .env ./
ENV CHROME_BIN="/usr/bin/chromium-browser" \
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
RUN apk add --no-cache font-noto-emoji udev ttf-freefont chromium
RUN yarn install --prod
COPY ./prisma/ ./prisma/
RUN apk add so:libssl.so.1.1
RUN yarn prisma-migrate-deploy
RUN yarn prisma db seed
COPY . .
EXPOSE 8080
CMD [ "node", "dist/main.js"]