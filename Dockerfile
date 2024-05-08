FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm i

COPY . .

ENV NODE_PATH=./build
ENV NODE_OPTIONS= --experimental-specifier-resolution=node
RUN npm run build

EXPOSE 8080


CMD ["node", "--experimental-specifier-resolution=node",  "./build/index.js"]