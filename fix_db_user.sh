#!/bin/bash

# Fix Postgres User Script
# Relies on the fact that we can access the DB as 'sa1bit' (admin)
# and we need to fix the 'user1bit' (non-root) password/permissions.

# Load variables from .env to ensure we use exactly what's configured
if [ -f .env ]; then
    export $(cat .env | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

echo "--- Fixing Postgres Credentials ---"
echo "Admin User: $POSTGRES_USER"
echo "Target User: $POSTGRES_NON_ROOT_USER"

# 1. Update the password for user1bit to match .env
echo "1. Resetting password for $POSTGRES_NON_ROOT_USER..."
docker exec postgres-wachat psql -U $POSTGRES_USER -d $POSTGRES_DB -c "ALTER USER \"$POSTGRES_NON_ROOT_USER\" WITH PASSWORD '$POSTGRES_NON_ROOT_PASSWORD';"

# 2. Grant permissions again just in case
echo "2. Granting database permissions..."
docker exec postgres-wachat psql -U $POSTGRES_USER -d $POSTGRES_DB -c "GRANT ALL PRIVILEGES ON DATABASE evolution TO \"$POSTGRES_NON_ROOT_USER\";"
docker exec postgres-wachat psql -U $POSTGRES_USER -d $POSTGRES_DB -c "GRANT ALL PRIVILEGES ON DATABASE chat_app TO \"$POSTGRES_NON_ROOT_USER\";"

# 3. Restart Evolution API to retry migration
echo "3. Restarting Evolution API..."
docker restart evolution-api-wachat

echo "Done! Please check logs with: docker logs -f evolution-api-wachat"
