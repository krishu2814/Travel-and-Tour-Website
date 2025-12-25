const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt'); // encrypt the password:- npm i bcrypt

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide us your email.'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Hey provide a valid e-mail.'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'], // user roles
    default: 'user', // by default , it will be user
  },
  password: {
    type: String,
    required: [true, 'Please enter your password.'],
    minlength: 8,
    select: false, // Prevents the password from being returned in query results by default
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This validator only works on CREATE and SAVE!!!
      // It checks if 'passwordConfirm' matches the 'password' field.
      validator: function (el) {
        return el === this.password;
      },
      message:
        'Passwords are not the same! ,Password and ConfirmPassword must be same✅',
    },
  },
  passwordChangedAt: Date, // Timestamp when the password was last changed
  passwordResetToken: String, // Hashed token for password reset
  passwordResetExpires: Date, // Expiration time for the reset token
  active: {
    type: Boolean,
    default: true, // for login users set later...
    select: false, // Prevents the 'active' field from being returned in query results by default
  },
});

/**
 * PRE HOOK MIDDLEWARE
 * before .save() and .create()
 */

// 1) ENCRYPTION MIDDLEWARE: Hashes the password before saving it to the database
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // agar password change kiye to hash krdo password ...
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field before saving to DB
  this.passwordConfirm = undefined;
  next();
});

// 2) DOCUMENT MIDDLEWARE: Runs before .save() and .create() for passwordChangedAt
userSchema.pre('save', function (next) {
  // If the password has not been changed or the document is new,
  // then no need to update passwordChangedAt, so it proceeds to next()
  // and skips the rest of the middleware.
  if (!this.isModified('password') || this.isNew) return next();

  // When a user changes their password, and a JWT is issued immediately after that,
  // both the JWT iat (issued at) and the passwordChangedAt may be the same due to time resolution.
  // This is important when checking if the token was issued before or after
  // the password was changed, for logging out old sessions.
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

/**
 * PRE HOOK MIDDLEWARE
 * before .find() => .find(), .findOne(), .findById(), .findOneAndUpdate() ✅
 */
// QUERY MIDDLEWARE: Runs before any find query => getAllUsers
userSchema.pre(/^find/, function (next) {
  // 'this' points to the current query
  // This query middleware ensures that only active users are returned by default
  // It filters out documents where 'active' is not equal to false.
  this.find({ active: { $ne: false } });
  next();
});

/////////////////////////////////////////////////////////////////////////////////////////
/**
 * @param {*} candidatePassword
 * @param {*} userPassword
 * @returns
 * instance methods defined on your Mongoose userSchema that handle authentication logic
 */
// INSTANCE METHOD: Compares a candidate password with the stored hashed password
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  // 'this' refers to the current document
  // bcrypt.compare() internally hashes candidatePassword and checks if it equals the hash in userPassword.
  return await bcrypt.compare(candidatePassword, userPassword); // Returns true or false
};

// INSTANCE METHOD: Checks if the user's password was changed after the JWT was issued
// This method's name was corrected from 'changedPasswordAfter' to 'changePasswordAfter'
userSchema.methods.changePasswordAfter = function (JWTTimestamp) {
  // 'this' refers to the current document
  if (this.passwordChangedAt) {
    // Convert the passwordChangedAt date to a Unix timestamp in seconds
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    // Return true if the password was changed AFTER the JWT was issued
    // (i.e., the JWT's issued-at timestamp is less than the password change timestamp)
    return JWTTimestamp < changedTimestamp;
  }
  // If passwordChangedAt doesn't exist, it means the password has never been changed
  // so the token is still valid regarding password changes.
  return false;
};

// INSTANCE METHOD: Generates a random password reset token and saves its hashed version
// and expiration date to the document.
userSchema.methods.createPasswordResetToken = function () {
  // Generate a random 32-byte hexadecimal string for the reset token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the reset token using SHA256 for storage in the database
  // This ensures that if the database is compromised, the plain token is not exposed.
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set the expiration time for the reset token (e.g., 10 minutes from now)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // Return the unhashed token to be sent to the user (e.g., via email)
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
