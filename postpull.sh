#!/bin/bash

# Folder Permissions Fix

# 1. n8n runs as user 'node' (UID 1000)
chown -R 1000:1000 /1BIT_N8N_NEW/n8nData
chmod -R 775 /1BIT_N8N_NEW/n8nData

# 2. Postgres runs as user 'postgres' (UID 999) - THIS IS CRITICAL
# If this is wrong, Postgres cannot read its own DB files
chown -R 999:999 /1BIT_N8N_NEW/postgresData
chmod -R 700 /1BIT_N8N_NEW/postgresData

# 3. Evolution API and others usually fine with standard user or 1000, 
# but ensuring the base structure is accessible.
chmod 755 /1BIT_N8N_NEW
