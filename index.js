const express = require("express");
const app = express();
const db = require('./db');
require('dotenv').config();
const PORT = process.env.PORT || 3000;
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
global.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

const userroute = require('./route/userProfile');
const mealroute = require('./route/meal');
const analysisroute = require('./route/analysis');
// const recipeRoute = require('./route/Recipe');

app.use('/user', userroute);
app.use('/meal', mealroute);
app.use('/analysis', analysisroute);
app.use('/generate-meal-plan', mealroute);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});