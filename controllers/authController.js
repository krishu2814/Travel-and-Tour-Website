const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken'); /* Authorization: Bearer <token> */
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');
const BlacklistedToken = require('../models/blacklistedToken');

/*   signup => login => protect =>  REMEMBER  */
// jwt.sign([payload => id,role] ,[secretOrPrivateKey] , [options=> expiresIn,issuer,audience],[callback] )
const signToken = function (id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// IMPORTANT
const createSendToken = (user, statusCode, res) => {
  // create tokin with user ID
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000, //milliseconds
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

////////////////////////////////////////////////////////////////////////////////
// {{URL}}api/v1/users/login

exports.signup = catchAsync(async (req, res, next) => {
  // 1) Create a new user

  // during signup user give these information in {body💥} of postman
  // User => defined in model / schema
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });

  // 2) sending token to new user for login...
  createSendToken(newUser, 201, res);
});

///////////////////////////////////////////////////////////////////////////////////////////////

// For login user will need email and password ....
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; // object destructing using ES6

  // 1) Check if email and password exist

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists && password is correct✅

  // (email : email) is equivalent to { email } in ES6 ...
  // use +password to get it in output as we removed from all the users for security ...
  // as we marked {select: false} for password...
  // You need the password from the database to compare it with the input password....
  const user = await User.findOne({ email: email }).select('+password');

  // const correct✅ = await user.correctPassword(password, user.password); // also good
  // correctPassword is an instance or function => userModel.js using bcrypt...
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) Set active: true for the logged-in user
  await User.findByIdAndUpdate(user._id, { active: true });

  // 4) If everything ok, send token to client
  // Identify the user in future requests for profile update,password reset etc...

  createSendToken(user, 200, res);
});

///////////////////////////////////////////////////////////////////////////////////////////////
/* TO GRANT ACCESS FOR PROTECTED ROUTE */
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there

  //  authorization: 'Bearer gjvjghgjhgjkghhgkgkh'
  /* Authorization: Bearer <token> */
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer') // bearer token
  ) {
    token = req.headers.authorization.split(' ')[1]; // token is 2nd element
  }

  if (!token) {
    return next(
      new AppError('Your are not logged in! Please log in to get access', 401),
    );
  }

  /* IMPORTANT => Learnt From Google */
  const blacklisted = await BlacklistedToken.findOne({ token });
  if (blacklisted) {
    return next(
      new AppError(
        'This token has been blacklisted. Please log in again.',
        401,
      ),
    );
  }

  // 2) Verification of the token
  // jwt.verify => Verifies that a JWT (JSON Web Token) is authentic and not expired.
  // process.env.JWT_SECRET => secret key you used when you {signed the token} during login
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log('Decoded JWT:', decoded); // we get decoded id

  // 3) Check if the user still exists
  // jwt.verify() returns the payload inside the token :- {id => user id} ,,, {iat/exp => timestamp}
  // finding user with decoded id returned using token
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user no longer exists.', 401));
  }
  // 4) Check if currentUser changed password after the token was issued
  if (currentUser.changePasswordAfter(decoded.iat)) {
    //{iat => issued at timestamp
    return next(
      new AppError(
        'User recently changed the password ! Please login again.',
        401,
      ),
    );
  }
  // GRANT ACCESS TO PROTECTED ROUTE to user found using decoded id...
  req.user = currentUser;
  next();
});

/////////////////////////////////////////////////////////////////////////////////////////////////////
// who can delete the tour...
// runs after protect function ...
// role came from above line => req.user = currentUser
// authController.restrictTo('admin','lead-guide')
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles ['admin' , 'lead-guide']
    // role is in schema
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You donot have permission to perform this action.', 403),
      );
    }
    next(); // deletetour => route handler
  };
////////////////////////////////////////////////////////////////////////////////////////////////////

exports.forgetPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on posted email

  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user found with this email.', 404));
  }

  // 2) generate the users token => userModel.js

  const resetToken = user.createPasswordResetToken(); // will be used to send email

  /* IMPORTANT */
  // deactivate all validators specified in the schema...
  await user.save({ validateBeforeSave: false }); // no need to enter the email or req.body

  // 3) send it back as an email => email.js

  //  we get an email to reset password => link takes us to that page (link to reset passsword)
  // for development and production...
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forget your password? Submit a PATCH request 
  with your new password and passwordConfirm to : ${resetURL}  that 
  we have sent just now💯. \n If you didn't forget your password then IGNORE🤡`;

  /* SEND EMAIL => sendEmail() => email.js (earlier we send using test-email.js) */
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token is valid for 10 minutes.',
      message,
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to the email',
    });
  } catch (err) {
    // Clear the reset token fields to prevent reuse
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false }); // Save the user with the new password.
    return next(
      new AppError('There was an error in sending the email. Try again later'),
      500,
    );
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////////
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on token from URL
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token) // it is a praameter since we specified it in the URL
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, // check for token expired????
  });

  // 2) if token has not expired and their is a user , set the new password
  // user already checks for expired token so need to do it again
  if (!user) {
    return next(new AppError('Token is invalid or has expired!', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // save the document ....
  await user.save(); // we want validator to confirm everything so dont turn off...

  // 3) update changedPasswordAt property for the user
  /* GO TO USER MODEL TO UPDATE THE PASSWORD => INSTANCE */

  // 4) log the user in , send jwt
  createSendToken(user, 200, res);
});

///////////////////////////////////////////////////////////////////////////////////////////////
/* 1) passwordCurrent  2) passwordConfirm   3)password */
exports.updatePassword = catchAsync(async (req, res, next) => {
  // User.findByIdAndUpdate()  will not work for password .... => IMPORTANT(CREATE AND SAVE)
  // TOKEN IS SAME AS FOR LOGIN USERS...
  // 1) Get the user from the collection only for login user...
  const user = await User.findById(req.user.id).select('+password'); // only for security

  // 2) Check if posted password is correct
  if (!user.correctPassword(req.body.passwordCurrent, user.password)) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so , update the password => in body
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // we will not turn off validation to check above both are equal...
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in , send jwt
  createSendToken(user, 200, res);
});

///////////////////////////////////////////////////////////////////////////////////////////////////

exports.logout = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
        ? req.headers.authorization.split(' ')[1]
        : null;
    if (!token) {
      return res.status(400).json({ message: 'No token provided.' });
    }

    // jwt.verify ensures the token is valid by checking its signature against the secret key (process.env.JWT_SECRET).
    // If the token is valid, it decodes the payload, which includes the user ID and expiration time.
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.exp) {
      return res.status(400).json({ message: 'Invalid token.' });
    }
    // Check if the token is already blacklisted
    const existingBlacklistedToken = await BlacklistedToken.find({ token });
    if (existingBlacklistedToken.length > 0) {
      return res.status(400).json({ message: 'Token already blacklisted.' });
    }
    await BlacklistedToken.create({
      token,
      expiresAt: new Date(decoded.exp * 1000),
    });
    // active: true => manually set in login function
    // This line updates the user document in the database to remove the 'active' field.
    // Remove the 'active' field from the user document => from  [co-pilot]
    await User.findByIdAndUpdate(decoded.id, { $unset: { active: '' } });

    res.status(200).json({
      status: 'success',
      message: 'User successfully logged out and token blacklisted.',
    });
  } catch (err) {
    next(err);
  }
};

/*
💥protection =>
  
✅ Checks if a valid JWT token is sent by the client

🔍 Verifies the token

👤 Ensures the user still exists

🔄 Ensures the user hasn't changed their password after the token was issued

🎟 Grants access to the route by attaching the user to req.user

*/
