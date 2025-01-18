const express = require('express');
const multer = require('multer');
const cors = require('cors');
const OpenAI = require('openai');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Configure CORS
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:5000',
        'https://interview-app-c5296.web.app',
        'https://interview-app-c5296.firebaseapp.com',
        'https://interview-prep-backend.onrender.com'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// ... existing code ...

// API Routes
app.post('/api/check-answer', async (req, res) => {
    // ... existing code ...
});

app.post('/api/assess-readiness', async (req, res) => {
    // ... existing code ...
});

app.post('/api/generate-questions', async (req, res) => {
    // ... existing code ...
});

// Serve static files AFTER API routes
app.use(express.static('public'));

// Catch-all route for SPA
app.get('*', (req, res) => {
    // Only handle non-API routes
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 