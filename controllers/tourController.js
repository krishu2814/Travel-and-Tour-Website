// eslint-disable-next-line no-unused-vars
const Tour = require('../models/tourModel');
// A helper to catch async errors and pass them to Express error-handling middleware
const catchAsync = require('../utils/catchAsync');
const Factory = require('./handleFactory');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5'; // effectively limiting the number of results to 5.
  req.query.sort = '-ratingsAverage,price';
  // only the specified fields will be returned in the API response,
  // making the response payload smaller and more efficient.
  req.query.fields = 'name, price, ratingsAverage, summary, difficulty';
  next();
};

/* API FEATURES */
// basically we passed all tours controllers in catchAsync() function

exports.getAllTours = Factory.getAll(Tour);
// exports.getAllTours = catchAsync(async (req, res, next) => {
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   const tours = await features.query;

//   // query.sort().select().limit().skip()
//   // SEND RESPONSE
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
// });

// Get a single tour by ID with populated reviews
// Factory.getOne will handle the population of reviews
// This allows us to get a tour along with its associated reviews in a single query.
// { path: '' , select: '' } are options for the populate method
exports.getTour = Factory.getOne(Tour, { path: 'reviews' });
// exports.getTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findById(req.params.id).populate('reviews'); // Populate reviews for the tour
//   // Tour.findOne({ _id: req.params.id })  // another way
//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404)); // not working?
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });

exports.createTour = Factory.createOne(Tour); // => signUp
// exports.createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
// });

exports.updateTour = Factory.updateOne(Tour);
// exports.updateTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     // Updates that tour document with the new data provided in the request body (req.body).
//     //req.params.id would be 123 for /api/v1/tours/123
//     new: true, // we want to send the updated document... and change body part
//     runValidators: true,
//   });
//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404)); // not working?
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour, // updated tour
//     },
//   });
// });

exports.deleteTour = Factory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404)); // not working?
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null, // important
//   });
// });

//////////////////////////////////////////////////////////////////////////////////////////////////

// REDO AND PRACTICE
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' }, //IMPORTANT :- define for each filtering....
        // _id: '$ratingsAverage',
        numTours: { $sum: 1 }, // $sum: 1 means add 1 for each document encountered in the group.
        numRatings: { $sum: '$ratingsQuantity' }, //  Sums up the ratingsQuantity for all tours within each group.
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minprice: { $min: '$price' },
        maxprice: { $max: '$price' },
      },
    },
    // old namse will not be used from now onwards...
    // use names from $group...
    {
      $sort: { avgPrice: 1 }, // ASCENDING
    },
    {
      // it will be excluded ...
      $match: { _id: { $ne: 'EASY' } }, // 125:- uppercase by us.
    },
  ]); // array of stages  // mongo atlas documentaion

  res.status(200).json({
    status: 'success',
    data: {
      stats, // updated tour
    },
  });
});

// REDO AND REWATCH AND PRACTICE
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // Convert string to number, e.g., '2025' -> 2025

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', // Break array into separate documents
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // Group by month number (1-12)
        numTourStarts: { $sum: 1 }, // Count the number of tours per month
        tours: { $push: '$name' }, // Add tour names to an array
      },
    },
    {
      $addFields: { month: '$_id' }, // Rename _id to month
    },
    {
      $project: {
        _id: 0, // Remove original _id
        month: 1,
        numTourStarts: 1,
        tours: 1,
      },
    },
    {
      $sort: { numTourStarts: -1 }, // Sort by number of tours descending
    },
    {
      $limit: 12, // Limit to top 12 months (though logically only 12 exist)
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

/*
 
1) MongoDB aggregation expects each stage to be a single object with one field name that is the operator ($group, $project, etc.).
2) Inside $group, you define the fields you want to compute as key-value pairs.
3) But here, you combined two separate fields ($month and numTourStarts) in the same object without the proper $group structure.

*/
