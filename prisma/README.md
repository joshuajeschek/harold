## Database Setup
```sql
-- CREATE DATABASE harold;

\connect harold;

CREATE SCHEMA IF NOT EXISTS dev;
CREATE SCHEMA IF NOT EXISTS prod;

-- admin user
GRANT ALL ON DATABASE harold TO jjeschek;
GRANT ALL ON SCHEMA dev, prod TO jjeschek;
GRANT ALL ON ALL TABLES IN SCHEMA dev, prod TO jjeschek;

-- dev user
CREATE USER devharold WITH ENCRYPTED PASSWORD '***';
GRANT USAGE ON SCHEMA dev TO devharold;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA dev TO devharold;

-- prod user
CREATE USER harold WITH ENCRYPTED PASSWORD '***';
GRANT USAGE ON SCHEMA prod TO harold;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA prod TO harold;
```
