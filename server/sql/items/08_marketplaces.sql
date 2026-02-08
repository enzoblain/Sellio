CREATE TABLE marketplaces (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,

  url TEXT,
);