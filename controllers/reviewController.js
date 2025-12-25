const Review = require('../models/reviewModel');
const Factory = require('./handleFactory');

// Get all reviews
exports.getAllReview = Factory.getAll(Review);
// exports.getAllReview = catchAsync(async (req, res, next) => {
//   let filter = {};
//   // If tourId is provided in the request parameters, filter reviews by that tour
//   // This allows us to get all reviews for a specific tour
//   // e.g., /tours/:tourId/reviews
//   if (req.params.tourId) filter = { tour: req.params.tourId };

//   const review = await Review.find(filter);

//   if (!review) {
//     return next(new AppError('No reviews found', 404));
//   }
//   // If reviews are found, send them in the response
//   res.status(200).json({
//     status: 'success',
//     results: review.length,
//     data: {
//       review,
//     },
//   });
// });

// Get a single review by ID
exports.getReview = Factory.getOne(Review);
// exports.getReview = catchAsync(async (req, res, next) => {
//   const review = await Review.findById();

//   if (!review) {
//     return next(new AppError('No review found with that ID', 404));
//   }
//   // If review is found, send it in the response
//   res.status(200).json({
//     status: 'success',
//     results: review.length,
//     data: {
//       review,
//     },
//   });
// });

// Create a new review
// Middleware to set tour and user IDs for the review => New Review on Tour...
exports.setTourUserIds = (req, res, next) => {
  // Nested routes: /tours/:tourId/reviews
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};
exports.createReview = Factory.createOne(Review);
// exports.createReview = catchAsync(async (req, res, next) => {
// if (!req.body.tour) req.body.tour = req.params.tourId;
// if (!req.body.user) req.body.user = req.user.id;
//   // Create a new review using the Review model
//   const newReview = await Review.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       review: newReview,
//     },
//   });
// });

exports.updateReview = Factory.updateOne(Review);
// exports.updateReview = catchAsync(async (req, res, next) => {
//   const review = await Review.findByIdAndUpdate(req.params.id, req.body, {
//     new: true, // Return the updated document
//     runValidators: true, // Update the review with new data
//   });

//   if (!review) {
//     return next(new AppError('No review found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       review,
//     },
//   });
// });

exports.deleteReview = Factory.deleteOne(Review);
// exports.deleteReview = catchAsync(async (req, res, next) => {
//   const review = await Review.findByIdAndDelete(req.params.id);

//   if (!review) {
//     return next(new AppError('No review found with that ID', 404));
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null, // No content to send back
//   });
// });
