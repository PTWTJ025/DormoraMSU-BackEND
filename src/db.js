// src/db.js
const { Pool } = require('pg');
require('dotenv').config();
const logger = require('./logger');

if (!process.env.DATABASE_URL) {
  logger.error("DATABASE_URL is not set in .env file.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Optional: you can add minimal health logs if needed

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;