const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Configure Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

router.post('/analyze', upload.single('image'), async (req, res) => {
    console.log('Received analyze request');
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file uploaded" });
        }

        const imagePath = req.file.path;
        const imageType = req.file.mimetype;

        // Read the image file
        const image = fs.readFileSync(imagePath);
        const base64Image = Buffer.from(image).toString('base64');

        // Initialize the Gemini model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Prepare the prompt
        const prompt = `
        Analyze this food image and provide:
        1. Identify the overall dish name (e.g., "Burger", "Veg Pizza", "Chicken Curry").
        2. List of identified food ingredients with quantity estimates and calorie counts.
        3. Total calorie range.

        STRICT RESPONSE FORMAT:
        Dish_Name: [Overall Dish Name]
        1. [Food Item] - [Quantity] - [Calories]
        2. [Food Item] - [Quantity] - [Calories]
        ...
        Total_Calories: Total X
        `;

        // Create the image part for Gemini
        const imagePart = {
            inlineData: {
                mimeType: imageType,
                data: base64Image,
            },
        };

        // Generate content using the model
        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();

        // Extract dish name and total calories using regex
        const dishNameMatch = responseText.match(/Dish_Name:\s*(.+)/);
        const totalCaloriesMatch = responseText.match(/Total_Calories:\s*([0-9]+)/);

        const dishName = dishNameMatch ? dishNameMatch[1].trim() : 'Unknown';
        const totalCalories = totalCaloriesMatch ? parseInt(totalCaloriesMatch[1]) : 0;

        // Send the response
        res.json({
            dish_name: dishName,
            total_calories: totalCalories,
            raw_analysis: responseText,
            success: true,
        });

    } catch (error) {
        console.error('Error in analyze endpoint:', error);
        res.status(500).json({
            error: "An unexpected error occurred",
            details: error.message,
        });
    } finally {
        // Clean up the uploaded file
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
    }
});

module.exports = router;