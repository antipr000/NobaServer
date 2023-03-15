FROM --platform=linux/amd64 node:16-alpine

# NODE_ENV is not "required" as it is "used" while running the image.
# env NODE_ENV=e2e_test
ENV DATABASE_URL=postgresql://e2e_user:pass@postgres-db:5432/Noba_E2E

RUN apk update && apk add bash
ENV CHROME_BIN="/usr/bin/chromium-browser" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
RUN apk add --no-cache font-noto-emoji udev ttf-freefont chromium

COPY . .
EXPOSE 8080

RUN yarn install
RUN yarn prisma-generate
RUN yarn build