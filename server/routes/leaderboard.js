const express = require('express');
const router = express.Router();
const Leaderboard = require('../models/Leaderboard');
const authMiddleware = require('../middleware/auth');

// Get global leaderboard
router.get('/global', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const leaderboard = await Leaderboard.find()
      .sort({ score: -1 })
      .limit(limit)
      .skip(skip)
      .populate('user', 'username level avatar');

    // Update ranks
    leaderboard.forEach((entry, index) => {
      entry.rank = skip + index + 1;
    });

    const total = await Leaderboard.countDocuments();

    res.json({
      leaderboard,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leaderboard by WPM
router.get('/wpm', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const leaderboard = await Leaderboard.find()
      .sort({ highestWPM: -1 })
      .limit(limit)
      .populate('user', 'username level avatar');

    res.json({ leaderboard });
  } catch (error) {
    console.error('Get WPM leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leaderboard by wins
router.get('/wins', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const leaderboard = await Leaderboard.find()
      .sort({ totalWins: -1 })
      .limit(limit)
      .populate('user', 'username level avatar');

    res.json({ leaderboard });
  } catch (error) {
    console.error('Get wins leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user rank
router.get('/rank/me', authMiddleware, async (req, res) => {
  try {
    const userEntry = await Leaderboard.findOne({ user: req.user._id });

    if (!userEntry) {
      return res.status(404).json({ message: 'Leaderboard entry not found' });
    }

    const rank = await Leaderboard.countDocuments({ score: { $gt: userEntry.score } }) + 1;

    res.json({
      rank,
      entry: userEntry
    });
  } catch (error) {
    console.error('Get rank error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
