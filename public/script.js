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