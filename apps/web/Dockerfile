FROM node:20-alpine AS build

WORKDIR /app

COPY package.json /app/
RUN corepack enable
RUN pnpm install

COPY . /app
RUN pnpm build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
