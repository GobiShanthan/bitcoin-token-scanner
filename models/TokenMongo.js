// models/TokenMongo.js - MongoDB schema for Token model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define schema that matches the Token class structure
const tokenSchema = new Schema({
  // Basic token identification
  tokenId: { 
    type: String, 
    required: true, 
    index: true 
  },
  amount: {
    type: Number
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  timestamp: {
    type: Number
  },
  
  // Bitcoin transaction data
  txid: { 
    type: String,
    index: true
  },
  blockHeight: { 
    type: Number,
    index: true
  },
  blockHash: {
    type: String
  },
  blockTime: {
    type: Number
  },
  
  // Token validation
  isValidScript: {
    type: Boolean,
    default: true
  },
  typeCode: {
    type: Number,
    default: 0
  },
  
  // Additional fields for querying
  protocol: {
    type: String,
    default: 'Other',
    index: true
  },
  name: {
    type: String
  },
  symbol: {
    type: String
  }
}, {
  timestamps: true  // Adds createdAt and updatedAt
});

// Create compound indexes for efficient querying
tokenSchema.index({ blockHeight: -1, tokenId: 1 });
tokenSchema.index({ name: 'text', tokenId: 'text' });

// Create the model
const TokenMongo = mongoose.model('Token', tokenSchema);

module.exports = TokenMongo;