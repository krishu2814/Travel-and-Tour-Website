const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgetPassword', authController.forgetPassword);
router.patch('/resetPassword/:token', authController.resetPassword); // token will be sent

// Protect all routes after this middleware ...
router.use(authController.protect);
router.patch(
  '/updateMyPassword',
  authController.restrictTo('user'),
  authController.updatePassword,
);

// To get the current user, we use the getMe middleware to set req.params.id to the current user's ID
router.get('/me', userController.getMe, userController.getUser); // Get current user

router.patch('/updateMe', userController.updateMe);
router.patch('/deleteMe', userController.deleteMe);

router.post('/logout', authController.logout);

// Admin routes for managing users
// These routes are protected and restricted to 'admin' role
router.use(authController.restrictTo('admin'));
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
