// models/BlockProgress.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blockProgressSchema = new Schema({
  lastScannedHeight: {
    type: Number,
    required: true
  },
  lastScannedHash: {
    type: String
  },
  lastScanTimestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// We'll only ever have one document in this collection
blockProgressSchema.statics.getProgress = async function() {
  let progress = await this.findOne();
  if (!progress) {
    // Initialize with a starting block if none exists
    progress = await this.create({
      lastScannedHeight: process.env.INITIAL_BLOCK_HEIGHT || 4321372, // Use your desired starting point
      lastScanTimestamp: new Date()
    });
  }
  return progress;
};

blockProgressSchema.statics.updateProgress = async function(height, hash) {
  let progress = await this.findOne();
  if (!progress) {
    return await this.create({
      lastScannedHeight: height,
      lastScannedHash: hash,
      lastScanTimestamp: new Date()
    });
  }
  
  progress.lastScannedHeight = height;
  progress.lastScannedHash = hash;
  progress.lastScanTimestamp = new Date();
  return await progress.save();
};

const BlockProgress = mongoose.model('BlockProgress', blockProgressSchema);
module.exports = BlockProgress;