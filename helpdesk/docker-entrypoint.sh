#!/bin/sh
# Bind Apache to the platform-provided $PORT (Railway/Render set this; default 8080).
set -e
PORT="${PORT:-8080}"
sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s#<VirtualHost \*:[0-9]+>#<VirtualHost *:${PORT}>#" /etc/apache2/sites-available/000-default.conf
exec apache2-foreground
