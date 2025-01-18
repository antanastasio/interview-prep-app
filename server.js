const express = require('express');
const multer = require('multer');
const cors = require('cors');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Configure CORS
app.use(cors());

// Body parsing middleware
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Basic route for testing
app.get('/', (req, res) => {
    console.log('Root endpoint accessed');
    res.send('Interview Prep Backend is Running');
});

// Test route
app.get('/api/test', (req, res) => {
    console.log('Test endpoint accessed');
    res.json({ message: 'Backend is running!' });
});

// Generate questions endpoint
app.post('/api/generate-questions', async (req, res) => {
    console.log('Generate questions endpoint accessed');
    console.log('Request body:', req.body);
    
    try {
        const { jobData, type } = req.body;
        
        if (!jobData || !type) {
            console.error('Missing required fields');
            return res.status(400).json({ 
                error: 'Missing required fields',
                jobData: !!jobData,
                type: !!type
            });
        }

        console.log('OpenAI Key present:', !!process.env.OPENAI_API_KEY);
        
        if (!process.env.OPENAI_API_KEY) {
            console.error('Missing OpenAI API key');
            return res.status(500).json({ error: 'Server configuration error: Missing API key' });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a professional interviewer. Generate interview questions in JSON format. Each question should have 'question' and 'answer' properties."
                },
                {
                    role: "user",
                    content: `Generate 5 ${type} interview questions based on this job description: "${jobData}". Format the response as a JSON array.`
                }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        console.log('OpenAI response:', content);

        const parsedContent = JSON.parse(content);
        const questions = Array.isArray(parsedContent) ? parsedContent : parsedContent.questions;

        if (!Array.isArray(questions)) {
            throw new Error('Invalid response format from OpenAI');
        }

        console.log('Sending response with questions');
        res.json({ questions });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate questions',
            details: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Server starting...');
    console.log(`Server running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('Available routes:');
    console.log('- GET /');
    console.log('- GET /api/test');
    console.log('- POST /api/generate-questions');
}); 