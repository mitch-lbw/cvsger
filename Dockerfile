FROM nginx:alpine

ARG APP_HOME=/usr/share/nginx/html

RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY ./dist .

EXPOSE 80 443

CMD ["nginx","-g","daemon off;"]
