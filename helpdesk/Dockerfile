# Customer Helpdesk — production container (PHP 8.3 + Apache)
#
# Build context is this folder (helpdesk/). Serves index.php / api.php on $PORT
# (defaults to 8080). Works as-is on Railway, Render, Fly.io, or any Docker host.
FROM php:8.3-apache

# --- PHP extensions the app needs: gd, zip, pdo_sqlite (pdo + curl are bundled)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpng-dev libjpeg62-turbo-dev libzip-dev libsqlite3-dev \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" gd zip pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

# --- Apache: enable rewrite/headers and honour the app's .htaccess rules
RUN a2enmod rewrite headers \
    && sed -ri 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf

# --- App
COPY . /var/www/html/
RUN mkdir -p /var/www/html/data/images \
    && chown -R www-data:www-data /var/www/html/data

# --- Bind to the platform-provided $PORT at start-up
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENV PORT=8080
EXPOSE 8080
CMD ["docker-entrypoint.sh"]
