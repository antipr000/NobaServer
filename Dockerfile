FROM node:16-alpine
COPY package*.json ./
RUN yarn install --prod
COPY prisma/* ./prisma/
RUN apk add jq aws-cli so:libssl.so.1.1
ENV AWS_ACCESS_KEY_ID=AKIATB4EQBQAWTFEY2GA
ENV AWS_SECRET_ACCESS_KEY=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
ENV AWS_DEFAULT_REGION=us-east-1
ENV AWS_REGION=us-east-1
#RUN echo "DATABASE_URL=`aws secretsmanager get-secret-value --secret-id 'SANDBOX_DB_URL' --query 'SecretString' --output text | jq -r '.SANDBOX_DB_URL'`" > .env
RUN echo "DATABASE_URL=postgresql://noba-app:KIdmksdu2ijfHH322@noba-lowers-instance-1.cultavdhwi1h.us-east-1.rds.amazonaws.com:5432/postgres?schema=sandbox" > .env
RUN yarn prisma-migrate-deploy
COPY . .
EXPOSE 8080
CMD [ "node", "dist/main.js"]