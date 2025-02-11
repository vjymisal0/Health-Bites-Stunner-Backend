const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

router.post('/generate-meal-plan', async (req, res) => {
    try {
        const {
            ingredients,
            dietType,
            numberOfMeals,
            nutritionRequirements
        } = req.body;

        // Construct the prompt for Gemini
        const prompt = `Generate ${numberOfMeals} healthy ${dietType} recipes using some or all of these ingredients: ${ingredients.join(', ')}. 
    
    Nutrition requirements:
    ${nutritionRequirements.minCalories ? `- Minimum calories: ${nutritionRequirements.minCalories}` : ''}
    ${nutritionRequirements.maxCalories ? `- Maximum calories: ${nutritionRequirements.maxCalories}` : ''}
    ${nutritionRequirements.minProtein ? `- Minimum protein: ${nutritionRequirements.minProtein}g` : ''}
    ${nutritionRequirements.maxProtein ? `- Maximum protein: ${nutritionRequirements.maxProtein}g` : ''}
    ${nutritionRequirements.minCarbs ? `- Minimum carbs: ${nutritionRequirements.minCarbs}g` : ''}
    ${nutritionRequirements.maxCarbs ? `- Maximum carbs: ${nutritionRequirements.maxCarbs}g` : ''}
    ${nutritionRequirements.minFat ? `- Minimum fat: ${nutritionRequirements.minFat}g` : ''}
    ${nutritionRequirements.maxFat ? `- Maximum fat: ${nutritionRequirements.maxFat}g` : ''}

    For each recipe, provide:
    1. Recipe name
    2. Ingredients list with quantities
    3. Step-by-step instructions
    4. Nutritional information (calories, protein, carbs, fat)
    5. Cooking time
    6. Difficulty level (easy, medium, hard)

    Format the response as a JSON array with the following structure for each recipe:
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
      "cookingTime": number (in minutes),
      "difficulty": "easy|medium|hard"
    }`;

        // Get the Gemini model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the response as JSON
        const recipes = JSON.parse(text);

        // Store recipes in database
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const recipe of recipes) {
                const query = `
          INSERT INTO recipes (
            title, 
            ingredients, 
            instructions, 
            nutrition,
            cooking_time,
            difficulty,
            diet_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `;

                await client.query(query, [
                    recipe.title,
                    recipe.ingredients,
                    recipe.instructions,
                    recipe.nutrition,
                    recipe.cookingTime,
                    recipe.difficulty,
                    dietType
                ]);
            }

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        res.json({
            success: true,
            recipes
        });
    } catch (error) {
        console.error('Error generating meal plan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate meal plan'
        });
    }
});

module.exports = router;