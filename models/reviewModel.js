// review // rating //created at // ref to user // ref to tour
const mongoose = require('mongoose');
/* use ref to reference */
// User and Tour is parent of Review...
// const Tour = require('./tourModel');
// const User = require('./userModel');
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(), // Automatically sets the date when the review is created
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour', // Reference to the Tour model
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User', // Reference to the User model
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true }, // Include virtuals in JSON output
    toObject: { virtuals: true }, // Include virtuals in Object output
  },
);

// before getting the reviews, we want to populate the user and tour fields
// but it takes time
reviewSchema.pre(/^find/, function (next) {
  // Populate the user and tour fields with their respective data
  //   this.populate({
  //     path: 'tour',
  //     select: 'name', // Select only the name field from the Tour model
  //   }).populate({
  //     path: 'user',
  //     select: 'name photo', // Select the name and photo fields from the User model
  //   });
  /* No need to show tour in reviews => Onlt Tour with ID */
  this.populate({
    path: 'user',
    select: 'name photo', // Select the name and photo fields from the User model
  });
  next();
});

// Static method to calculate average ratings for a tour
// This method can be called on the Review model to update the average rating of a tour
// It uses aggregation to calculate the average rating and the number of ratings for a specific tour.
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // tourController.js
  // this points to the current model
  // It allows you to define a pipeline of stages that process documents in the collection and return aggregated results.
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }, // Match reviews for the specific tour
    },
    {
      $group: {
        _id: '$tour', // Group by tour ID
        nRating: { $sum: 1 }, // Count number of ratings
        avgRating: { $avg: '$rating' }, // Calculate average rating
      },
    },
  ]);
  console.log(stats);

  // If there are no ratings, set default values
  if (stats.length > 0) {
    await mongoose.model('Tour').findByIdAndUpdate(tourId, {
      // stats[0]._id is the tour ID
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  } else {
    await mongoose.model('Tour').findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0,
    });
  }
};

// DOCUMENT MIDDLEWARE (IMPORTANT => 168, 169)
// runs after any Mongoose query method that starts with findOneAnd (e.g., findOneAnd**Update**, findOneAnd**Delete**)
reviewSchema.post('save', function () {
  // this.tour is the ID of the tour this review belongs to.
  // Review is not yet defined till here...
  // this points to the current document
  // this.constructor: This refers to the model that created the document (Review model in this case).
  // Review.calcAverageRatings(tourId)
  this.constructor.calcAverageRatings(this.tour); // Call the static method to calculate average ratings
});

//  (e.g., findOneAnd**Update**, findOneAnd**Delete**)
// findByIdAndUpdate =>findOne
// findByIdAndDelete => findOne
// this pre hook can change sequence of data
// this is the query, not the document.
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  // console.log(this.r);
  next();
});

// so pass the function inside post hook
// this post hook is executed after the query has been executed
// so we can use this.r to access the review document
reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here, query has already executed
  // calling the static method to calculate average ratings
  // this.r is the review document that was found
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
