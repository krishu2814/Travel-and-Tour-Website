const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

// Preserve the req.params values from the parent router.
// If the parent and the child have conflicting param names, the child’s value take precedence
const router = express.Router({ mergeParams: true });

// Protect all routes after this middleware => applied on all
router.use(authController.protect);

// Routes for reviews
router
  .route('/')
  .get(reviewController.getAllReview) // Get all reviews
  // Create a new review (restricted to 'user' role)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview,
  );

router
  .route('/:id')
  .get(reviewController.getReview) // Get a single review by ID
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview,
  ); // Update a review (restricted to 'user' and 'admin')

router
  .route('/:id')
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  );

module.exports = router;
