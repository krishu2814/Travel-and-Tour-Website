// Loads the Express framework to create routes, middleware, and start a server.
const express = require('express');
// Logging middleware → prints incoming requests in the console (method, URL, response time).
const morgan = require('morgan');
// Prevents DDOS/brute-force attacks by limiting how many requests an IP can make.
const rateLimit = require('express-rate-limit');
// Sets secure HTTP headers (XSS protection, CSP, etc).
const helmet = require('helmet');
// Custom error class used for controlled errors (e.g., "Invalid token", "Not found").
const AppError = require('./utils/appError');
// Centralized error-handling middleware for sending error responses.
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

// 1) GLOBAL  MIDDLEWARE

// ✔ Helmet sets secure HTTP headers
// ✔ Prevents common attacks like XSS, clickjacking, etc.
app.use(helmet()); // => read documentation...

// Development logging
// Concise output colored by response status for development use.
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API -> Important
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again in an Hour!',
});
app.use('/api', limiter); // all that starts with /api....

// Body Parser => reading data from body into req.body
// Returns middleware that only parses json and only looks at requests where the Content-Type header matches the type option.
app.use(express.json({ limit: '10kb' })); // It parses incoming requests with JSON payloads.
// app.use((req, res, next) => {
//   console.log('--- app.js middleware ---');
//   console.log('Method:', req.method);
//   console.log('URL:', req.url);
//   console.log('Headers:', req.headers['content-type']); // Check content-type header
//   console.log('Body (after express.json):', req.body); // Should be populated if express.json works
//   console.log('--- End app.js middleware ---');
//   next();
// });

// Serving Static Files
app.use(express.static(`${__dirname}/public`)); // photos

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString(); // request time middleware...
  // console.log(req.headers);
  next();
});

// 3) ROUTES
app.use('/api/v1/tours', tourRouter); // separate for tours
app.use('/api/v1/users', userRouter); // separate for users
app.use('/api/v1/reviews', reviewRouter); // separate for reviews

// ALWAYS AT THE LAST ..
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ERROR HANDLING MIDDLEWARE  => it takes 4 parameters...
app.use(globalErrorHandler);

// export it
module.exports = app;
