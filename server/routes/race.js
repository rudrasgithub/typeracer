const express = require('express');
const router = express.Router();
const Race = require('../models/Race');
const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');
const authMiddleware = require('../middleware/auth');

// Save race results
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { roomId, text, participants, startTime, endTime } = req.body;

    // Find winner (position 1)
    const winner = participants.find(p => p.position === 1);

    const race = new Race({
      roomId,
      text,
      participants,
      winner: winner ? winner.user : null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: 'finished'
    });

    await race.save();

    // Update user stats and leaderboard
    for (const participant of participants) {
      const user = await User.findById(participant.user);
      if (user) {
        // Update user stats
        user.stats.totalRaces += 1;
        if (participant.position === 1) {
          user.stats.totalWins += 1;
        }
        
        if (participant.wpm > user.stats.highestWPM) {
          user.stats.highestWPM = participant.wpm;
        }

        // Calculate new average WPM
        const totalWPM = user.stats.averageWPM * (user.stats.totalRaces - 1) + participant.wpm;
        user.stats.averageWPM = Math.floor(totalWPM / user.stats.totalRaces);

        // Calculate new average accuracy
        const totalAccuracy = user.stats.averageAccuracy * (user.stats.totalRaces - 1) + participant.accuracy;
        user.stats.averageAccuracy = Math.floor(totalAccuracy / user.stats.totalRaces);

        // Calculate words typed (approximate)
        const words = text.split(' ').length;
        user.stats.totalWordsTyped += words;

        // Add experience
        const xpGain = Math.floor(participant.wpm + (participant.accuracy / 2) + (participant.position === 1 ? 100 : 50));
        user.experience += xpGain;

        // Level up check (100 XP per level)
        const newLevel = Math.floor(user.experience / 100) + 1;
        if (newLevel > user.level) {
          user.level = newLevel;
        }

        await user.save();

        // Update leaderboard
        let leaderboardEntry = await Leaderboard.findOne({ user: user._id });
        if (leaderboardEntry) {
          leaderboardEntry.totalRaces = user.stats.totalRaces;
          leaderboardEntry.totalWins = user.stats.totalWins;
          leaderboardEntry.highestWPM = user.stats.highestWPM;
          leaderboardEntry.averageWPM = user.stats.averageWPM;
          leaderboardEntry.averageAccuracy = user.stats.averageAccuracy;
          await leaderboardEntry.save();
        }
      }
    }

    res.status(201).json({
      message: 'Race saved successfully',
      race
    });
  } catch (error) {
    console.error('Save race error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get race history for user
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const races = await Race.find({
      'participants.user': req.user._id
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('winner', 'username');

    const history = races.map(race => {
      const userParticipant = race.participants.find(
        p => p.user.toString() === req.user._id.toString()
      );

      return {
        id: race._id,
        roomId: race.roomId,
        date: race.createdAt,
        position: userParticipant.position,
        wpm: userParticipant.wpm,
        accuracy: userParticipant.accuracy,
        participants: race.participants.length,
        winner: race.winner ? race.winner.username : 'Unknown',
        duration: race.duration
      };
    });

    res.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get race details
router.get('/:raceId', authMiddleware, async (req, res) => {
  try {
    const race = await Race.findById(req.params.raceId)
      .populate('participants.user', 'username level')
      .populate('winner', 'username');

    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }

    res.json({ race });
  } catch (error) {
    console.error('Get race error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
