FROM node:18-alpine

WORKDIR /app

# copy server package and install deps
COPY server/package.json ./server/package.json
WORKDIR /app/server
RUN npm install --production

# copy full project
WORKDIR /app
COPY . /app

ENV NODE_ENV=production
EXPOSE 3001

WORKDIR /app/server
CMD ["node","index.js"]
