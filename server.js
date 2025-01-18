const express = require('express');
const multer = require('multer');
const cors = require('cors');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Debug middleware to log all requests
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    console.log('Headers:', req.headers);
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    next();
});

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

console.log('OpenAI initialized with API key present:', !!process.env.OPENAI_API_KEY);

// API Routes
const router = express.Router();

// Health check route
router.get('/', (req, res) => {
    console.log('[Health Check] Root endpoint accessed');
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Test route
router.get('/test', (req, res) => {
    console.log('[Test] Test endpoint accessed');
    res.json({
        message: 'Backend is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        openaiKeyPresent: !!process.env.OPENAI_API_KEY
    });
});

// Generate questions route
router.post('/generate-questions', async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Generate questions endpoint accessed`);
    console.log('Request body:', req.body);
    
    try {
        const { jobData, type } = req.body;
        
        if (!jobData || !type) {
            console.error('Missing required fields');
            return res.status(400).json({ 
                error: 'Missing required fields',
                jobData: !!jobData,
                type: !!type,
                timestamp
            });
        }

        console.log('OpenAI Key present:', !!process.env.OPENAI_API_KEY);
        
        if (!process.env.OPENAI_API_KEY) {
            console.error('Missing OpenAI API key');
            return res.status(500).json({ 
                error: 'Server configuration error: Missing API key',
                timestamp
            });
        }

        console.log('Making OpenAI API call...');
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

        console.log('OpenAI API call successful');
        const content = completion.choices[0].message.content;
        console.log('OpenAI response:', content);

        const parsedContent = JSON.parse(content);
        const questions = Array.isArray(parsedContent) ? parsedContent : parsedContent.questions;

        if (!Array.isArray(questions)) {
            throw new Error('Invalid response format from OpenAI');
        }

        console.log('Successfully generated questions');
        res.json({ 
            questions,
            timestamp,
            success: true
        });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate questions',
            details: error.message,
            timestamp,
            success: false
        });
    }
});

// Mount the router at /api
app.use('/api', router);

// Error handling middleware
app.use((err, req, res, next) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error:`, err);
    res.status(500).json({ 
        error: 'Internal server error', 
        details: err.message,
        timestamp
    });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Server starting...`);
    console.log(`Server running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('Available routes:');
    console.log('- GET /api (Health check)');
    console.log('- GET /api/test (API test)');
    console.log('- POST /api/generate-questions (Question generation)');
}); 