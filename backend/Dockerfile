FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 3000

# Run migrations before starting the app
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

