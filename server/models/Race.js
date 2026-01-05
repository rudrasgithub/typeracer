const mongoose = require('mongoose');

const raceSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  text: {
    type: String,
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    wpm: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 100
    },
    position: {
      type: Number,
      required: true
    },
    completionTime: {
      type: Number, // in seconds
      required: true
    }
  }],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number // in seconds
  },
  status: {
    type: String,
    enum: ['waiting', 'racing', 'finished'],
    default: 'waiting'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate duration before saving
raceSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  next();
});

module.exports = mongoose.model('Race', raceSchema);
