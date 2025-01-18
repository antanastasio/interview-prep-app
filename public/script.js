// API base URL - Automatically select between local and production
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:10000'
    : 'https://interview-prep-app-m9jc.onrender.com';

// DOM Elements
const jobUrl = document.getElementById('job-url');
const jobDescription = document.getElementById('job-description');
const uploadArea = document.getElementById('upload-area');
const resumeInput = document.getElementById('resume-input');
const fileName = document.getElementById('file-name');
const generateBtn = document.getElementById('generate');
const resultsDiv = document.getElementById('results');
const questionsList = document.getElementById('questions-list');

let resumeFile = null;

// Track answered questions and their evaluations
let answeredQuestions = new Set();
let questionEvaluations = {};

// Handle drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
});

// Handle file input
resumeInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleFileUpload(file);
});

uploadArea.addEventListener('click', () => {
    resumeInput.click();
});

function handleFileUpload(file) {
    if (!file) return;

    if (file.type === 'application/pdf' || 
        file.type === 'application/msword' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        resumeFile = file;
        fileName.textContent = file.name;
        fileName.style.display = 'block';
    } else {
        showError('Please upload a PDF or Word document');
        resumeFile = null;
        fileName.style.display = 'none';
    }
}

// Handle input synchronization
jobUrl.addEventListener('input', () => {
    if (jobUrl.value) {
        jobDescription.value = '';
    }
});

jobDescription.addEventListener('input', () => {
    if (jobDescription.value) {
        jobUrl.value = '';
    }
});

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // Remove any existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    generateBtn.parentNode.insertBefore(errorDiv, generateBtn);
    
    // Remove error after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Handle question generation
generateBtn.addEventListener('click', async () => {
    // Validate input
    if (!jobUrl.value && !jobDescription.value) {
        showError('Please provide a job description or URL');
        return;
    }

    // Update button state
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating Questions...';
    resultsDiv.style.display = 'none';

    try {
        // Get selected interview type
        const type = document.querySelector('input[name="interview-type"]:checked').value;
        
        const requestBody = {
            jobData: jobUrl.value || jobDescription.value,
            type: type
        };
        
        console.log('Making request to:', `${API_BASE_URL}/api/generate-questions`);
        console.log('Request body:', requestBody);

        // Send request to server
        const response = await fetch(`${API_BASE_URL}/api/generate-questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const contentType = response.headers.get('content-type');
        console.log('Content-Type:', contentType);

        // If response is not JSON, log the text content for debugging
        if (!contentType || !contentType.includes('application/json')) {
            const textContent = await response.text();
            console.error('Received non-JSON response:', textContent);
            throw new Error(`Server returned unexpected content type: ${contentType}. Response: ${textContent.substring(0, 100)}...`);
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
        }

        // Display results
        displayResults(data.questions);
    } catch (error) {
        console.error('Error details:', error);
        showError(`Error: ${error.message}. Check console for details.`);
        resultsDiv.style.display = 'none';
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Questions';
    }
});

// Display results
function displayResults(questions) {
    if (!questions || questions.length === 0) {
        showError('No questions were generated. Please try again.');
        return;
    }

    // Reset tracking
    answeredQuestions.clear();
    questionEvaluations = {};

    questionsList.innerHTML = questions.map((q, i) => `
        <div class="question" data-index="${i}">
            <h3>Q${i + 1}:</h3>
            <p>${q.question}</p>
            ${q.hint ? `<p class="hint"><strong>Hint:</strong> ${q.hint}</p>` : ''}
            <div class="answer-section">
                <textarea class="answer-input" placeholder="Type your answer here..."></textarea>
                <button class="check-answer-btn" onclick="checkAnswer(${i})">Check Answer</button>
                <div class="feedback" style="display: none;"></div>
                <div class="evaluation-details" style="display: none;">
                    <div class="scores-grid">
                        <div class="score-item">
                            <div class="score-label">Relevance</div>
                            <div class="score-value" id="relevance-score-${i}">-</div>
                        </div>
                        <div class="score-item">
                            <div class="score-label">Completeness</div>
                            <div class="score-value" id="completeness-score-${i}">-</div>
                        </div>
                        <div class="score-item">
                            <div class="score-label">Clarity</div>
                            <div class="score-value" id="clarity-score-${i}">-</div>
                        </div>
                        <div class="score-item">
                            <div class="score-label">Specificity</div>
                            <div class="score-value" id="specificity-score-${i}">-</div>
                        </div>
                    </div>
                    <div class="feedback-details">
                        <div class="strengths-section">
                            <h4>Strengths</h4>
                            <ul id="strengths-${i}"></ul>
                        </div>
                        <div class="improvements-section">
                            <h4>Areas for Improvement</h4>
                            <ul id="improvements-${i}"></ul>
                        </div>
                    </div>
                </div>
                <div class="model-answer" style="display: none;">
                    <div class="model-answer-header">Model Answer:</div>
                    <p>${q.answer}</p>
                </div>
            </div>
        </div>
    `).join('');

    // Add readiness assessment section (initially hidden)
    questionsList.insertAdjacentHTML('beforeend', `
        <div id="readiness-assessment" style="display: none;" class="readiness-section">
            <h3>Interview Readiness Assessment</h3>
            <button id="assess-readiness" class="assess-btn" onclick="assessReadiness()">
                Assess My Interview Readiness
            </button>
            <div id="assessment-result" class="assessment-result" style="display: none;">
                <div class="assessment-header">
                    <div class="overall-score">
                        <h4>Overall Score</h4>
                        <div class="score-circle">
                            <span id="overall-score-value">-</span>
                        </div>
                    </div>
                    <div class="readiness-level">
                        <h4>Readiness Level</h4>
                        <div id="readiness-level-value">-</div>
                    </div>
                </div>
                <div class="category-scores">
                    <h4>Performance by Category</h4>
                    <div class="scores-grid">
                        <div class="score-item">
                            <div class="score-label">Relevance</div>
                            <div class="score-value" id="overall-relevance">-</div>
                        </div>
                        <div class="score-item">
                            <div class="score-label">Completeness</div>
                            <div class="score-value" id="overall-completeness">-</div>
                        </div>
                        <div class="score-item">
                            <div class="score-label">Clarity</div>
                            <div class="score-value" id="overall-clarity">-</div>
                        </div>
                        <div class="score-item">
                            <div class="score-label">Specificity</div>
                            <div class="score-value" id="overall-specificity">-</div>
                        </div>
                    </div>
                </div>
                <div class="assessment-details">
                    <div class="strengths-section">
                        <h4>Key Strengths</h4>
                        <ul id="overall-strengths"></ul>
                    </div>
                    <div class="improvements-section">
                        <h4>Areas for Improvement</h4>
                        <ul id="overall-improvements"></ul>
                    </div>
                    <div class="recommendations-section">
                        <h4>Recommendations</h4>
                        <ul id="recommendations"></ul>
                    </div>
                    <div class="next-steps-section">
                        <h4>Next Steps</h4>
                        <ul id="next-steps"></ul>
                    </div>
                </div>
            </div>
        </div>
    `);

    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Store questions in a variable accessible to the checkAnswer function
    window.generatedQuestions = questions;
}

// Check answer
async function checkAnswer(questionIndex) {
    const questionDiv = document.querySelector(`.question[data-index="${questionIndex}"]`);
    const answerInput = questionDiv.querySelector('.answer-input');
    const feedbackDiv = questionDiv.querySelector('.feedback');
    const evaluationDiv = questionDiv.querySelector('.evaluation-details');
    const modelAnswerDiv = questionDiv.querySelector('.model-answer');
    const checkButton = questionDiv.querySelector('.check-answer-btn');

    const userAnswer = answerInput.value.trim();
    if (!userAnswer) {
        showError('Please provide an answer before checking.');
        return;
    }

    try {
        checkButton.disabled = true;
        checkButton.textContent = 'Checking...';

        const response = await fetch(`${API_BASE_URL}/api/check-answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: window.generatedQuestions[questionIndex].question,
                modelAnswer: window.generatedQuestions[questionIndex].answer,
                userAnswer: userAnswer
            })
        });

        if (!response.ok) {
            throw new Error('Failed to check answer');
        }

        const data = await response.json();
        const evaluation = data.evaluation;
        
        // Store evaluation for final assessment
        questionEvaluations[questionIndex] = evaluation;

        // Update scores
        questionDiv.querySelector('#relevance-score-' + questionIndex).textContent = evaluation.scores.relevance;
        questionDiv.querySelector('#completeness-score-' + questionIndex).textContent = evaluation.scores.completeness;
        questionDiv.querySelector('#clarity-score-' + questionIndex).textContent = evaluation.scores.clarity;
        questionDiv.querySelector('#specificity-score-' + questionIndex).textContent = evaluation.scores.specificity;

        // Update feedback lists
        const strengthsList = questionDiv.querySelector('#strengths-' + questionIndex);
        const improvementsList = questionDiv.querySelector('#improvements-' + questionIndex);
        
        strengthsList.innerHTML = evaluation.feedback.strengths.map(s => `<li>${s}</li>`).join('');
        improvementsList.innerHTML = evaluation.feedback.improvements.map(i => `<li>${i}</li>`).join('');

        // Show feedback
        feedbackDiv.innerHTML = `
            <div class="feedback-header">Overall Score: ${evaluation.overallScore}%</div>
            <p>${evaluation.suggestions}</p>
        `;

        feedbackDiv.style.display = 'block';
        evaluationDiv.style.display = 'block';
        modelAnswerDiv.style.display = 'block';

        // Mark question as answered
        answeredQuestions.add(questionIndex);

        // Show readiness assessment button if all questions are answered
        if (answeredQuestions.size === window.generatedQuestions.length) {
            document.getElementById('readiness-assessment').style.display = 'block';
            document.getElementById('readiness-assessment').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

    } catch (error) {
        showError(error.message || 'Error checking answer. Please try again.');
    } finally {
        checkButton.disabled = false;
        checkButton.textContent = 'Check Answer';
    }
}

// Assess interview readiness
async function assessReadiness() {
    const assessBtn = document.getElementById('assess-readiness');
    const assessmentResult = document.getElementById('assessment-result');

    try {
        assessBtn.disabled = true;
        assessBtn.textContent = 'Analyzing...';

        // Collect all answers
        const answers = Array.from(document.querySelectorAll('.answer-input')).map(input => input.value.trim());
        const evaluations = Object.values(questionEvaluations);

        const response = await fetch(`${API_BASE_URL}/api/assess-readiness`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                questions: window.generatedQuestions,
                answers: answers,
                evaluations: evaluations
            })
        });

        if (!response.ok) {
            throw new Error('Failed to assess readiness');
        }

        const data = await response.json();
        const assessment = data.assessment;
        
        // Update overall scores
        document.getElementById('overall-score-value').textContent = assessment.overallScore + '%';
        document.getElementById('readiness-level-value').textContent = assessment.readinessLevel;
        document.getElementById('overall-relevance').textContent = assessment.categoryScores.relevance;
        document.getElementById('overall-completeness').textContent = assessment.categoryScores.completeness;
        document.getElementById('overall-clarity').textContent = assessment.categoryScores.clarity;
        document.getElementById('overall-specificity').textContent = assessment.categoryScores.specificity;

        // Update lists
        document.getElementById('overall-strengths').innerHTML = 
            assessment.strengths.map(s => `<li>${s}</li>`).join('');
        document.getElementById('overall-improvements').innerHTML = 
            assessment.improvementAreas.map(i => `<li>${i}</li>`).join('');
        document.getElementById('recommendations').innerHTML = 
            assessment.recommendations.map(r => `<li>${r}</li>`).join('');
        document.getElementById('next-steps').innerHTML = 
            assessment.nextSteps.map(s => `<li>${s}</li>`).join('');

        assessmentResult.style.display = 'block';
        assessmentResult.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        showError(error.message || 'Error assessing readiness. Please try again.');
    } finally {
        assessBtn.disabled = false;
        assessBtn.textContent = 'Assess My Interview Readiness';
    }
} 