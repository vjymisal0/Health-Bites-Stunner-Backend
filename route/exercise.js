const express = require('express');
const router = express.Router();
const Exercise = require('../model/Exercise');
const moment = require('moment');

// Get today's exercises
router.get('/today', async (req, res) => {
    try {
        const today = moment().format('YYYY-MM-DD');
        const exercises = await Exercise.find({ date: today })
            .sort({ time: 1 });

        res.json({ exercises });
    } catch (error) {
        console.error('Error fetching exercises:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new exercise
router.post('/add', async (req, res) => {
    try {
        const { title, duration, calories, time, status } = req.body;
        const today = moment().format('YYYY-MM-DD');

        const exercise = new Exercise({
            title,
            duration,
            calories,
            time,
            status,
            date: today,
            user: req.user._id // Assuming you have user authentication middleware
        });

        await exercise.save();
        res.status(201).json({ message: 'Exercise added successfully', exercise });
    } catch (error) {
        console.error('Error adding exercise:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update exercise status
router.patch('/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const exercise = await Exercise.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!exercise) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        res.json({ message: 'Exercise status updated', exercise });
    } catch (error) {
        console.error('Error updating exercise status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete exercise
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const exercise = await Exercise.findByIdAndDelete(id);

        if (!exercise) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        res.json({ message: 'Exercise deleted successfully' });
    } catch (error) {
        console.error('Error deleting exercise:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;