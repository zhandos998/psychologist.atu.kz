# syntax=docker/dockerfile:1.7

ARG PHP_BASE_IMAGE=student-profile-app:latest

FROM node:22-alpine AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY resources ./resources
COPY public ./public
COPY vite.config.js ./
COPY postcss.config.js tailwind.config.js ./
RUN npm run build

FROM ${PHP_BASE_IMAGE} AS app

WORKDIR /var/www/html

RUN rm -rf /var/www/html/* /var/www/html/.[!.]* /var/www/html/..?*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-psychologist.ini

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --optimize-autoloader \
    --no-scripts

COPY . .
COPY --from=assets /app/public/build ./public/build
COPY docker/php/entrypoint.sh /usr/local/bin/psychologist-entrypoint

RUN chmod +x /usr/local/bin/psychologist-entrypoint \
    && mkdir -p \
        storage/app/public \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/testing \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache public/build \
    && composer dump-autoload --optimize

ENTRYPOINT ["psychologist-entrypoint"]
CMD ["php-fpm"]

FROM nginx:1.27-alpine AS nginx
WORKDIR /var/www/html

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=app /var/www/html/public ./public

RUN mkdir -p storage/app/public \
    && ln -sfn ../storage/app/public public/storage
