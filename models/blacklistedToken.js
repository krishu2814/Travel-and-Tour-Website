const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

/*
1) MongoDB supports TTL indexes (Time-To-Live) =>  auto-delete document after `expiresAt`
2) index({ expiresAt: 1 }) creates an index on the expiresAt field.
3) The 1 means the index is in ascending order (required for TTL; doesn't affect TTL behavior).
4) { expireAfterSeconds: 0 } tells MongoDB to delete the document exactly at the time in expiresAt.
 */
blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BlacklistedToken = mongoose.model(
  'BlacklistedToken',
  blacklistedTokenSchema,
);
module.exports = BlacklistedToken;
