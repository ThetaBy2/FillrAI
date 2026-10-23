FROM node:22-slim

ENV NODE_ENV=production
WORKDIR /app

COPY backend/package*.json /app/backend/
RUN cd /app/backend && npm install --omit=dev

COPY backend/src /app/backend/src
COPY backend/seed_data /app/backend/seed_data
COPY frontend /app/frontend

EXPOSE 8000

CMD ["npm", "start", "--prefix", "backend"]

