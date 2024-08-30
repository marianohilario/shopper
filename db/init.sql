SELECT 'CREATE DATABASE shopper'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'shopper')\gexec