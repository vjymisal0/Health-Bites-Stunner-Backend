const express = require('express');
const router = express.Router();
const DailyMealPlan = require('../model/Meal');
const Recipe = require('../model/Recipe');
const moment = require('moment');

// Cache for storing recently generated recipes
const recipeCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Get total calories for today - Optimized with lean()
router.get('/today-calories/:userid', async (req, res) => {
    try {
        const userid = req.params.userid.replace(/^"|"$/g, '');
        const today = moment().format('YYYY-MM-DD');

        const mealPlan = await DailyMealPlan.findOne({
            user: userid,
            date: today
        }).lean();

        if (!mealPlan) {
            return res.json({ totalCalories: 0 });
        }

        res.json({ totalCalories: mealPlan.totalCalories, meals: mealPlan.meals });
    } catch (error) {
        console.error("Error fetching today's calories:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add food - Optimized with bulk operations
router.post('/add-food', async (req, res) => {
    try {
        const { userid, foodName, calories, mealTime } = req.body;

        if (!userid || !foodName || !calories) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const today = moment().format('YYYY-MM-DD');
        const userId = userid.replace(/^"|"$/g, '');

        const result = await DailyMealPlan.findOneAndUpdate(
            { user: userId, date: today },
            {
                $push: { meals: { foodName, calorieCount: calories, mealTime } },
                $inc: { totalCalories: calories }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        res.status(201).json({
            success: true,
            message: "Food added successfully!",
            dailyMealPlan: result,
            addedMeal: {
                name: foodName,
                calories: calories
            }
        });
    } catch (error) {
        console.error("Error adding food:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// Get food history - Optimized with projection and lean()
router.get('/food-history/:userid', async (req, res) => {
    try {
        const userid = req.params.userid.replace(/^"|"$/g, '');
        const days = parseInt(req.query.days) || 7;

        const endDate = moment().endOf('day');
        const startDate = moment().subtract(days - 1, 'days').startOf('day');

        const mealPlans = await DailyMealPlan.find({
            user: userid,
            date: {
                $gte: startDate.format('YYYY-MM-DD'),
                $lte: endDate.format('YYYY-MM-DD')
            }
        })
            .select('date meals totalCalories')
            .lean()
            .sort({ date: -1 });

        res.json({ success: true, mealPlans });
    } catch (error) {
        console.error("Error fetching food history:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to get cached recipes or generate new ones
const getCachedOrGenerateRecipes = async (cacheKey, generateFunc) => {
    const cached = recipeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.recipes;
    }

    const recipes = await generateFunc();
    recipeCache.set(cacheKey, {
        recipes,
        timestamp: Date.now()
    });
    return recipes;
};

// Generate meal plans using Gemini - Optimized with caching and better prompts
router.post('/generate-meal-plan', async (req, res) => {
    try {
        const {
            ingredients,
            dietType,
            numberOfMeals,
            nutritionRequirements,
            cuisinePreference
        } = req.body;

        const cacheKey = JSON.stringify({ ingredients, dietType, numberOfMeals, nutritionRequirements, cuisinePreference });

        const generateRecipes = async () => {
            const prompt = `As a professional chef and nutritionist, create ${numberOfMeals} healthy ${dietType} recipes.
${cuisinePreference ? `Cuisine preference: ${cuisinePreference}` : ''}
Ingredients available: ${ingredients.join(', ')}

Requirements:
${nutritionRequirements.minCalories ? `- Min calories: ${nutritionRequirements.minCalories}` : ''}
${nutritionRequirements.maxCalories ? `- Max calories: ${nutritionRequirements.maxCalories}` : ''}
${nutritionRequirements.minProtein ? `- Min protein: ${nutritionRequirements.minProtein}g` : ''}
${nutritionRequirements.maxProtein ? `- Max protein: ${nutritionRequirements.maxProtein}g` : ''}
${nutritionRequirements.minCarbs ? `- Min carbs: ${nutritionRequirements.minCarbs}g` : ''}
${nutritionRequirements.maxCarbs ? `- Max carbs: ${nutritionRequirements.maxCarbs}g` : ''}
${nutritionRequirements.minFat ? `- Min fat: ${nutritionRequirements.minFat}g` : ''}
${nutritionRequirements.maxFat ? `- Max fat: ${nutritionRequirements.maxFat}g` : ''}

Return ONLY a JSON array of recipes with this structure:
{
  "title": "Recipe Name",
  "ingredients": ["ingredient1 with quantity", "ingredient2 with quantity"],
  "instructions": ["step1", "step2"],
  "nutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  },
  "cookingTime": number,
  "difficulty": "easy" or "medium" or "hard"
}`;

            const model = global.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json\n?|\n?```/g, '').trim();

            const recipes = JSON.parse(text);
            const validRecipes = recipes.filter(recipe => (
                recipe.title &&
                Array.isArray(recipe.ingredients) &&
                Array.isArray(recipe.instructions) &&
                recipe.nutrition &&
                typeof recipe.cookingTime === 'number' &&
                ['easy', 'medium', 'hard'].includes(recipe.difficulty)
            ));

            if (validRecipes.length === 0) {
                throw new Error('No valid recipes generated');
            }

            const savedRecipes = await Recipe.insertMany(
                validRecipes.map(recipe => ({
                    ...recipe,
                    dietType
                }))
            );

            return savedRecipes;
        };

        const recipes = await getCachedOrGenerateRecipes(cacheKey, generateRecipes);
        res.json({ success: true, recipes });

    } catch (error) {
        console.error('Error generating meal plan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate meal plan'
        });
    }
});

module.exports = router;