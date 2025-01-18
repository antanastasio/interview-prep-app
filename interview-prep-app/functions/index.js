/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Generate questions using OpenAI
async function generateQuestions(jobDescription, type) {
    console.log("Generating questions...");
    console.log("Type:", type);
    console.log("Job Description:", jobDescription);
    
    try {
        console.log("Sending request to OpenAI...");
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a professional interviewer. Generate interview questions in JSON format. Each question should be an object with 'question', optional 'hint', and 'answer' properties. The answer should provide a comprehensive example answer."
                },
                {
                    role: "user",
                    content: `Generate 5 ${type} interview questions based on this job description: "${jobDescription}". Include hints for technical questions and model answers for all questions. Format the response as a JSON array.`
                }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        console.log("Raw OpenAI response:", completion.choices[0]);
        
        // Get the response content
        const content = completion.choices[0].message.content;
        console.log("Response content:", content);

        // Parse the JSON response
        try {
            const parsedContent = JSON.parse(content);
            const questions = Array.isArray(parsedContent) ? parsedContent : parsedContent.questions;
            
            if (!Array.isArray(questions)) {
                throw new Error("Response is not in the expected format");
            }

            return questions;
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            throw new Error("Failed to parse the generated questions");
        }
    } catch (error) {
        console.error("OpenAI API Error:", error.response?.data || error);
        throw new Error(error.message || "Failed to generate questions");
    }
}

// Check answer using OpenAI
async function checkAnswer(question, modelAnswer, userAnswer) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are an interview expert who evaluates answers. Analyze the response based on the following criteria:
                    1. Relevance (0-25): How well the answer addresses the question
                    2. Completeness (0-25): Whether all aspects are covered
                    3. Clarity (0-25): How clearly ideas are expressed
                    4. Specificity (0-25): Level of detail and examples
                    
                    Provide feedback in JSON format with the following structure:
                    {
                        "scores": {
                            "relevance": number,
                            "completeness": number,
                            "clarity": number,
                            "specificity": number
                        },
                        "feedback": {
                            "strengths": string[],
                            "improvements": string[]
                        },
                        "overallScore": number,
                        "suggestions": string
                    }`
                },
                {
                    role: "user",
                    content: `Question: ${question}\n\nModel Answer: ${modelAnswer}\n\nUser Answer: ${userAnswer}\n\nProvide a detailed evaluation of the answer.`
                }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("OpenAI API Error:", error.response?.data || error);
        throw new Error("Failed to evaluate answer");
    }
}

// Assess interview readiness
async function assessReadiness(questions, answers, evaluations) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are an expert interview coach who assesses candidates' interview readiness. 
                    Analyze their performance across all questions and provide a comprehensive assessment in JSON format:
                    {
                        "overallScore": number,
                        "categoryScores": {
                            "relevance": number,
                            "completeness": number,
                            "clarity": number,
                            "specificity": number
                        },
                        "strengths": string[],
                        "improvementAreas": string[],
                        "recommendations": string[],
                        "readinessLevel": "High" | "Medium" | "Low",
                        "confidenceScore": number,
                        "nextSteps": string[]
                    }`
                },
                {
                    role: "user",
                    content: `Please assess the candidate's interview readiness based on these Q&A pairs and their evaluations:\n\n${
                        questions.map((q, i) => 
                            `Question ${i + 1}: ${q.question}\n` +
                            `Model Answer: ${q.answer}\n` +
                            `Candidate's Answer: ${answers[i]}\n` +
                            `Evaluation: ${evaluations[i]}\n\n`
                        ).join("\n")
                    }`
                }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("OpenAI API Error:", error.response?.data || error);
        throw new Error("Failed to assess interview readiness");
    }
}

// Check answer endpoint
app.post("/api/check-answer", async (req, res) => {
    try {
        const { question, modelAnswer, userAnswer } = req.body;

        if (!question || !modelAnswer || !userAnswer) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const evaluation = await checkAnswer(question, modelAnswer, userAnswer);
        res.json({ evaluation: JSON.parse(evaluation) });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Failed to check answer" });
    }
});

// Readiness assessment endpoint
app.post("/api/assess-readiness", async (req, res) => {
    try {
        const { questions, answers, evaluations } = req.body;

        if (!questions || !answers || !evaluations || questions.length !== answers.length) {
            return res.status(400).json({ error: "Invalid assessment data" });
        }

        const assessment = await assessReadiness(questions, answers, evaluations);
        res.json({ assessment: JSON.parse(assessment) });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Failed to assess interview readiness" });
    }
});

// Generate questions endpoint
app.post("/api/generate-questions", async (req, res) => {
    console.log("Received request to generate questions");
    console.log("Request body:", req.body);
    
    try {
        const { jobData, type } = req.body;
        
        if (!jobData) {
            console.error("Missing job data");
            return res.status(400).json({ error: "Job description is required" });
        }

        if (!type) {
            console.error("Missing interview type");
            return res.status(400).json({ error: "Interview type is required" });
        }

        if (!process.env.OPENAI_API_KEY) {
            console.error("Missing OpenAI API key");
            return res.status(500).json({ error: "Server configuration error: Missing API key" });
        }

        console.log("Calling generateQuestions...");
        const questions = await generateQuestions(jobData, type);
        console.log("Generated questions:", questions);
        
        if (!questions || !Array.isArray(questions)) {
            console.error("Invalid questions format:", questions);
            return res.status(500).json({ error: "Failed to generate valid questions" });
        }

        res.json({ questions });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ 
            error: process.env.NODE_ENV === "development" 
                ? `Error: ${error.message}\n${error.stack}` 
                : "Failed to generate questions. Please try again."
        });
    }
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);
