// This script is used to import or delete development data from JSON files
// into your MongoDB database.
// To run:
// - Import: node ./dev-data/data/import-dev-data.js --import
// - Delete: node ./dev-data/data/import-dev-data.js --delete

const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Import your Mongoose models
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

// Load environment variables from config.env file
dotenv.config({ path: './config.env' });

// Construct the full database connection string by replacing the placeholder
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

// --- READ JSON FILES ---
// Ensure these paths point to your actual JSON data files
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8')); // Corrected: Should read from users.json
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'), // Corrected: Should read from reviews.json
);

// --- IMPORT DATA INTO DATABASE ---
const importData = async () => {
  try {
    // Create documents for each model using the respective data
    await Tour.create(tours);
    // For users, if you have pre-hashed passwords or don't want schema validators
    // to run during bulk import, you can use { validateBeforeSave: false }. => passwordConfirm ...
    // Be cautious with this if you rely heavily on Mongoose validators.
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data successfully loaded. ✅');
  } catch (err) {
    console.error('Error importing data:', err.message);
    console.error(err.stack); // Log full stack trace for debugging
  } finally {
    // Always disconnect from the database and exit the process
    mongoose.disconnect();
    process.exit(0); // Exit with success code
  }
};

// --- DELETE ALL DATA FROM DATABASE ---
const deleteData = async () => {
  try {
    console.log('Deleting all tours...');
    await Tour.deleteMany(); // Delete all documents from the Tour collection
    console.log('Deleting all users...');
    await User.deleteMany(); // Delete all documents from the User collection
    console.log('Deleting all reviews...');
    await Review.deleteMany(); // Delete all documents from the Review collection
    console.log('Data successfully deleted. 🗑️');
  } catch (err) {
    console.error('Error deleting data:', err.message);
    console.error(err.stack); // Log full stack trace for debugging
  } finally {
    // Always disconnect from the database and exit the process
    mongoose.disconnect();
    process.exit(0); // Exit with success code
  }
};

// --- DATABASE CONNECTION AND COMMAND EXECUTION ---
mongoose
  .connect(DB, {
    // These options are deprecated in Mongoose 6+ and are no longer needed,
    // but including serverSelectionTimeoutMS and socketTimeoutMS can be useful.
    serverSelectionTimeoutMS: 5000, // Try to connect to a server for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  })
  .then(() => {
    console.log('DB connection successful from import script! 💥');
    // --- Execute import/delete based on command-line argument ---
    // This part is crucial: it ensures that importData() or deleteData()
    // are only called AFTER the database connection is established.
    if (process.argv[2] === '--import') {
      importData();
    } else if (process.argv[2] === '--delete') {
      deleteData();
    } else {
      console.log(
        'Please specify --import or --delete as a command-line argument.',
      );
      mongoose.disconnect(); // Disconnect if no valid command
      process.exit(1); // Exit with error code for invalid command
    }
  })
  .catch((err) => {
    // This block runs if the initial database connection fails
    console.error('DB connection error from import script:', err.message);
    console.error(err.stack); // Log the full stack trace for connection errors
    process.exit(1); // Exit the process immediately if DB connection fails
  });

// Log command-line arguments for debugging
console.log('Command-line arguments:', process.argv);
