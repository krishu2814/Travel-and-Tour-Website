/* eslint-disable import/no-extraneous-dependencies */
// SCHEMA  AND  MODELS
const mongoose = require('mongoose');

const slugify = require('slugify');
// const User = require('./userModel'); // => EMBEDDING

// const validator = require('validator'); => alpha
// trim: removes leading/trailing spaces.
// unique: MongoDB will ensure no two tours have the same name.
// Custom validator allows only letters and spaces.
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal then 40 characters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'], // check for only characters
      validate: {
        validator: function (val) {
          return /^[a-zA-Z\s]+$/.test(val); // Only allows letters and spaces
        },
        message: 'Tour name must only contain characters',
      },
    },
    // Typically used to store a URL-friendly version of the tour name
    // (e.g., "The Forest Hiker" → "the-forest-hiker").You can auto-generate this using a pre('save') hook and slugify.
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      // VALIDATORS => only allowed value...
      // only for strings...
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only points to current doc on NEW document creation => .save() || .create()
          // In update queries, this refers to the query, not the document, so this.price is undefined.
          return val < this.price; // user validator
        },
        message: 'Discount price ({VALUE}) should be below regular price', //MONGOOSE DOCUMENT
      },
    },
    summary: {
      type: String,
      trim: true, //only works for string and removes whitespace
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String], // multiple images...(rest images)
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, // will hide from user
    },
    startDates: [Date],
    // secretTour => .find() method
    secretTour: {
      type: Boolean,
      default: false,
    },

    //GeoJSON
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    // locations (array of embedded GeoJSON points)
    // Location Array
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // guides: Array, => EMBEDDING
    // guides contain reference
    // populate fills the data
    guides: [
      {
        // Specifies that the field contains MongoDB Object IDs.
        type: mongoose.Schema.ObjectId,
        // references the User model.
        // “Hey, when you populate this field, look into
        // the User model (i.e., users collection) using these ObjectIds.”
        ref: 'User',
      },
    ],
    //reviews: => child reference❌  => Virtual Populate ✅
  },
  // virtual => below code >>>>>>>>>>>>>>>>>>>>>>
  // Enables virtual properties (not stored in DB, but computed on the fly) to
  // show up when converting document to JSON or Object.
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// INDEXING
// tourSchema.index({ price: 1 }); // Compound index for price and ratingsAverage
tourSchema.index({ ratingsAverage: -1, price: 1 }); // Compound index for ratingsAverage and price
tourSchema.index({ slug: 1 }); // Index for slug to speed up queries
// Tour.findOne({ slug: req.params.slug });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7; // current document...
});

// VIRTUAL POPULATE
tourSchema.virtual('reviews', {
  ref: 'Review', // Model to use
  foreignField: 'tour', // Field in the Review model that references this Tour
  localField: '_id', // Field in the Tour model to match with the foreignField
});

// DOCUMENT MIDDLEWARE
// runs before .save() and .create() but not before .insertMany()
tourSchema.pre('save', function (next) {
  // console.log(this); // current document
  this.slug = slugify(this.name, { lower: true }); // slugify
  next();
});

/*
// EMBEDDING
// Replaces guide ObjectIds with actual user documents.
//This middleware runs before saving a document (.save() or .create()).
//Promise.all(guidesPromises) waits for all promises to resolve and assigns the resolved user documents to this.guides.
tourSchema.pre('save', async function (next) {
  const guidesPromises = this.guides.map(async (id) => await User.findById(id));
  this.guides = await Promise.all(guidesPromises);
  next();
});
*/

tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } }); // not equal
  this.start = Date.now();
  next();
});

/* Populating Tour Guide (153) */
// The guides field in the tourSchema is used to reference documents from the User collection.
// The populate method is used to automatically replace these references (Object IDs) with the actual user documents when querying the Tour collection.
tourSchema.pre(/^find/, function (next) {
  // The populate method replaces these references with full user documents during queries.
  // this.populate('guides'); // this is the query
  // this.populate({ path: 'guides', select: '-__v -passwordChangedAt' }); // select fields to exclude
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
});

// AGGREGATION MIDDLEWARE (REDO)
// Inserts $match stage at the beginning of pipeline.
tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); // same as we did in pipeline...

  console.log(this.pipeline());
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`); // DURATION
  console.log(docs);
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
