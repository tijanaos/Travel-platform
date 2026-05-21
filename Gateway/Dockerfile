FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY index.js .
COPY proto/ ./proto/
EXPOSE 8084
CMD ["node", "index.js"]
