FROM node:16
COPY package*.json ./
COPY override.conf /etc/ngnix/conf.d/
RUN yarn install --prod
COPY . .
EXPOSE 8080
CMD [ "node", "dist/main.js"]