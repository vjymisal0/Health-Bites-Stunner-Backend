const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    duration: { type: String, required: true },
    calories: { type: Number, required: true },
    time: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'completed', 'skipped'],
        default: 'pending'
    },
    date: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true }
}, { timestamps: true });

const Exercise = mongoose.model('Exercise', exerciseSchema);
module.exports = Exercise;