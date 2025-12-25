/* eslint-disable no-console */
// npx ndb npm run start => chromium
// mongod
// mongosh "mongodb+srv://cluster0.ejbxzwx.mongodb.net/" --apiVersion 1 --username krishu

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Written FIRST
// Unhandled exceptions are runtime errors
// that occur in a program but are not caught by any try-catch
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

/* Can use either of below two */

// const DB = process.env.DATABASE_PASSWORD;
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

// ✅ Connect to MongoDB first
mongoose
  .connect(DB)
  .then(() => {
    console.log('✅ DB connection is successful.');

    // ✅ Now start the server safely
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`🚀 App running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('❌ DB connection error:', err);
    // process.exit(1); // ❗ Optional: stop app if DB fails
  });

// Handle unhandled promise rejections (like DB auth failures, etc)
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});
