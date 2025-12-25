const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Factory = require('./handleFactory');

// function to filter the required object...
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  // keys name..
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el]; // only allowed fields not role✅
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  // req.user is set by the authController.protect middleware
  req.params.id = req.user.id; // set the id to the current user id
  next();
};

exports.getAllUsers = Factory.getAll(User);
// exports.getAllUsers = catchAsync(async (req, res) => {
//   const users = await User.find();

//   res.status(200).json({
//     status: 'success',
//     results: users.length,
//     data: {
//       users,
//     },
//   });
// });

// UPDATE EMAIL OR USER
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) create a error if user change password
  // because we cannot update password.... => data update
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password update!', 400));
  }

  // 2) filterObj is defined above => fields that we want...
  // some fields are required => user.save() => will not work...
  const filteredBody = filterObj(req.body, 'name', 'email'); // only that we want to update ater req.body

  // 3) update user document BUT NOT PASSWORD AND ROLE => only NAME / EMAIL
  // roles cannot be changed...
  // body.name: 'krishu',
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });
  /* IMPORTANT */
  // Note: updatedUser.save() is not typically needed after findByIdAndUpdate with { new: true }
  // unless you have pre/post save hooks you want to trigger.
  // updatedUser.name = 'krishu'; // This line will be overwritten if 'name' is not in filteredBody or if it's updated via filteredBody.
  // If you want to explicitly set 'krishu', do it before findByIdAndUpdate or ensure it's part of filteredBody.

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// just mark the user not active
// CORRECTED: Changed 'deleteMe' to 'deleteMe' to match userRoutes.js
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// USER FACTORY FUNCTIONS
// No Populate options are needed for user operations
exports.getUser = Factory.getOne(User);
// exports.getUser = (req, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not yet defined!',
//   });
// };

// exports.createUser = Factory.createOne(User); => signUp
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined!❌ , Please use /signup instead.✅',
  });
};
/* BELOW OPERATIONS ARE RESTRICTED */
exports.updateUser = Factory.updateOne(User);
// exports.updateUser = (req, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not yet defined!',
//   });
// };
exports.deleteUser = Factory.deleteOne(User);
// exports.deleteUser = (req, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not yet defined!',
//   });
// };
