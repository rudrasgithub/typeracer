const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  totalRaces: {
    type: Number,
    default: 0
  },
  totalWins: {
    type: Number,
    default: 0
  },
  highestWPM: {
    type: Number,
    default: 0
  },
  averageWPM: {
    type: Number,
    default: 0
  },
  averageAccuracy: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate score and win rate before saving
leaderboardSchema.pre('save', function(next) {
  if (this.totalRaces > 0) {
    this.winRate = (this.totalWins / this.totalRaces) * 100;
  }
  
  // Score calculation: (averageWPM * 2) + (averageAccuracy) + (wins * 50)
  this.score = Math.floor(
    (this.averageWPM * 2) + 
    this.averageAccuracy + 
    (this.totalWins * 50)
  );
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
