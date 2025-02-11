const express = require('express');
const router = express.Router();
const Chat = require('../model/Chat');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Context for the AI to understand its role
const SYSTEM_PROMPT = `You are a helpful nutrition and health assistant for the Health Bite app. 
Your role is to:
- Answer questions about nutrition, diet, and healthy living
- Provide guidance on using the Health Bite app features
- Give meal planning and exercise advice
- Keep responses concise, friendly, and focused on health/nutrition
- Never provide medical advice or diagnoses
- Always encourage users to consult healthcare professionals for medical concerns

Current app features:
- Meal tracking
- Food recognition
- Exercise logging
- Nutrition goals
- Water intake tracking
- Recipe recommendations`;

router.post('/chat', async (req, res) => {
    try {
        const { message, userId } = req.body;

        if (!message || !userId) {
            return res.status(400).json({ error: 'Message and userId are required' });
        }

        // Initialize the model
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Combine system prompt with user message
        const prompt = `${SYSTEM_PROMPT}\n\nUser: ${message}\nAssistant:`;

        // Generate response
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Store the chat interaction
        const chat = new Chat({
            userId,
            message,
            response: text
        });
        await chat.save();

        res.json({
            reply: text,
            timestamp: chat.timestamp
        });
    } catch (error) {
        console.error('Error processing chat:', error);
        res.status(500).json({
            error: 'Failed to process chat message',
            details: error.message
        });
    }
});

// Get chat history for a user
router.get('/history/:userId', async (req, res) => {
    try {
        const userId = req.params.userId.replace(/^"|"$/g, '');
        const history = await Chat.find({ userId })
            .sort({ timestamp: -1 })
            .limit(50); // Limit to last 50 messages

        res.json({ success: true, history });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

module.exports = router; // Fixed the incorrect export
