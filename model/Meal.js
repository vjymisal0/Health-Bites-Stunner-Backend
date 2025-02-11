const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
    foodName: { type: String, required: false },
    calorieCount: { type: Number, required: false },
    mealTime: { type: Date, required: false }
});

const dailyMealPlanSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true }, // Reference to Profile
    date: { type: String , required: true }, // Store date as a Date type for better queries
    meals: [mealSchema], // Array of meals for the day
    totalCalories: { type: Number, default: 0 } // Fixed naming
}, { timestamps: true });

// Middleware: Ensure totalCalories is initialized
dailyMealPlanSchema.pre('save', function (next) {
    if (this.isNew && (this.totalCalories === undefined || this.totalCalories === null)) {
        this.totalCalories = 0;
    }
    next();
});

const DailyMealPlan = mongoose.model('DailyMealPlan', dailyMealPlanSchema);
module.exports = DailyMealPlan;
