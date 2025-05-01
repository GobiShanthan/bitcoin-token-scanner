// models/TokenMongo.js
const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
  tokenId: String,
  amount: Number,
  metadata: String,
  timestamp: Number,
  txid: { type: String, unique: true },
  blockHeight: Number,
  blockHash: String,
  blockTime: Number,
  isValidScript: Boolean,
  typeCode: Number
}, { timestamps: true });

module.exports = mongoose.model('Token', TokenSchema);
