FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm install typescript tsx

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

EXPOSE 3001

# Gun relay data persists in this volume
VOLUME /app/cadence-relay-data

CMD ["node", "dist/index.js"]
