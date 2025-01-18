// API base URL - Automatically select between local and production
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:10000'
    : 'https://interview-prep-app-m9jc.onrender.com';

// DOM Elements

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
        
        // Send request to server
        const response = await fetch(`${API_BASE_URL}/api/generate-questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jobData: jobUrl.value || jobDescription.value,
                type: type
            })
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Server returned unexpected content type: ${contentType}`);
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate questions');
        }

        // Display results
        displayResults(data.questions);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Error generating questions. Please try again.');
        resultsDiv.style.display = 'none';
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Questions';
    }
}); 