// // node test-email.js => email1.js

// // This file is used to test the sendEmail function from email1.js
// // IMPORTANT: Load environment variables from config.env
// // The path './config.env' assumes config.env is in the same directory as test-email.js.
// // If your config.env is in a different location (e.g., in the parent directory),
// // you MUST adjust the path accordingly (e.g., '../config.env').
// require('dotenv').config({ path: './config.env' });

// const sendEmail = require('./email1'); // Import the sendEmail function from email.js

// // Example usage of the sendEmail function
// const testSendEmail = async () => {
//   try {
//     // Replace with a test email address where you can receive the email
//     const options = {
//       email: 'rajputkrishu2814@gmail.com', // <-- IMPORTANT: Replace with a real email address for testing
//       subject: 'Test Email from Node.js',
//       text: 'Hello from your Node.js email sender!', // Using 'text' from options.message
//     };

//     // Call the sendEmail function with the options
//     await sendEmail(options);
//     console.log('Test email initiated successfully!');
//   } catch (error) {
//     console.error('Failed to send test email:', error);
//   }
// };

// // Call the test function to send an email
// testSendEmail();
