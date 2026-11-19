#!/bin/sh

set -e

cd /var/www/html

echo "Clearing Laravel configuration..."
php artisan config:clear

echo "Running database migrations..."
php artisan migrate --force

echo "Running StoreFlow database seeders..."
php artisan db:seed --force

echo "Starting Apache..."
exec apache2-foreground
