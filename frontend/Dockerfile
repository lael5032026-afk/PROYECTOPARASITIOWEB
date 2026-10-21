FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
ENV NGINX_ENVSUBST_FILTER=^API_HOST$
ARG PUBLIC_STORE_ONLY=true
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY nginx.public.conf.template /tmp/nginx.public.conf.template
RUN if [ "$PUBLIC_STORE_ONLY" = "true" ]; then \
      cp /tmp/nginx.public.conf.template /etc/nginx/templates/default.conf.template; \
    fi && rm /tmp/nginx.public.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
