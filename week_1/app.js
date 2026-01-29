// Global variables
let reviews = [];
let apiToken = '';

// DOM elements
const analyzeBtn = document.getElementById('analyze-btn');
const reviewText = document.getElementById('review-text');
const sentimentResult = document.getElementById('sentiment-result');
const loadingElement = document.querySelector('.loading');
const errorElement = document.getElementById('error-message');
const apiTokenInput = document.getElementById('api-token');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Load the TSV file
    loadReviews();
    
    // Set up event listeners
    analyzeBtn.addEventListener('click', analyzeRandomReview);
    apiTokenInput.addEventListener('change', saveApiToken);
    
    // Load saved API token if exists
    const savedToken = localStorage.getItem('hfApiToken');
    if (savedToken) {
        apiTokenInput.value = savedToken;
        apiToken = savedToken;
    }
});

// Load and parse the TSV file using Papa Parse
function loadReviews() {
    fetch('reviews_test.tsv')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load TSV file');
            return response.text();
        })
        .then(tsvData => {
            Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',
                complete: (results) => {
                    // Store both text and sentiment from TSV
                    reviews = results.data
                        .map(row => ({
                            text: row.text,
                            sentiment: parseInt(row.sentiment) || 0,
                            summary: row.summary || ''
                        }))
                        .filter(item => item.text && item.text.trim() !== '');
                    console.log('Loaded', reviews.length, 'reviews with sentiment data');
                },
                error: (error) => {
                    console.error('TSV parse error:', error);
                    showError('Failed to parse TSV file: ' + error.message);
                }
            });
        })
        .catch(error => {
            console.error('TSV load error:', error);
            showError('Failed to load TSV file: ' + error.message);
        });
}

// Save API token to localStorage
function saveApiToken() {
    apiToken = apiTokenInput.value.trim();
    if (apiToken) {
        localStorage.setItem('hfApiToken', apiToken);
    } else {
        localStorage.removeItem('hfApiToken');
    }
}

// Analyze a random review
async function analyzeRandomReview() {
    hideError();
    
    if (reviews.length === 0) {
        showError('No reviews available. Please try again later.');
        return;
    }
    
    const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];
    
    // Display the review
    reviewText.textContent = selectedReview.text;
    
    // Show loading state
    loadingElement.style.display = 'block';
    analyzeBtn.disabled = true;
    sentimentResult.innerHTML = '';
    sentimentResult.className = 'sentiment-result';
    
    try {
        // First try to use Hugging Face API if token is provided
        if (apiToken) {
            try {
                const result = await analyzeWithHuggingFace(selectedReview.text);
                displaySentiment(result, true);
            } catch (apiError) {
                console.warn('Hugging Face API failed, falling back to local analysis:', apiError);
                // Fall back to local sentiment analysis
                analyzeLocally(selectedReview);
            }
        } else {
            // No token, use local analysis
            analyzeLocally(selectedReview);
        }
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Failed to analyze sentiment. Please try again.');
    } finally {
        loadingElement.style.display = 'none';
        analyzeBtn.disabled = false;
    }
}

// Try to analyze with Hugging Face API
async function analyzeWithHuggingFace(text) {
    const response = await fetch(
        'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english',
        {
            headers: { 
                Authorization: apiToken ? `Bearer ${apiToken}` : '',
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({ inputs: text }),
        }
    );
    
    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

// Analyze sentiment locally using data from TSV
function analyzeLocally(review) {
    // Use the sentiment from TSV data (1 = positive, -1 = negative)
    let sentiment, label, confidence;
    
    if (review.sentiment === 1) {
        sentiment = 'positive';
        label = 'POSITIVE';
        confidence = 0.95; // High confidence for clear sentiment
    } else if (review.sentiment === -1) {
        sentiment = 'negative';
        label = 'NEGATIVE';
        confidence = 0.90; // High confidence for clear sentiment
    } else {
        sentiment = 'neutral';
        label = 'NEUTRAL';
        confidence = 0.50;
    }
    
    displaySentiment({
        label: label,
        score: confidence,
        source: 'local'
    }, false);
}

// Display sentiment result
function displaySentiment(result, fromAPI = true) {
    let sentiment, label, score;
    
    if (fromAPI) {
        // Parse API response
        if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && result[0].length > 0) {
            const sentimentData = result[0][0];
            label = sentimentData.label?.toUpperCase() || 'NEUTRAL';
            score = sentimentData.score ?? 0.5;
            
            // Determine sentiment
            if (label === 'POSITIVE' && score > 0.5) {
                sentiment = 'positive';
            } else if (label === 'NEGATIVE' && score > 0.5) {
                sentiment = 'negative';
            } else {
                sentiment = 'neutral';
            }
        } else {
            sentiment = 'neutral';
            label = 'NEUTRAL';
            score = 0.5;
        }
    } else {
        // Local analysis result
        label = result.label;
        score = result.score;
        sentiment = result.label.toLowerCase();
    }
    
    // Update UI
    sentimentResult.classList.add(sentiment);
    const sourceIndicator = fromAPI ? '' : ' (from TSV data)';
    sentimentResult.innerHTML = `
        <i class="fas ${getSentimentIcon(sentiment)} icon"></i>
        <span>${label} (${(score * 100).toFixed(1)}% confidence${sourceIndicator})</span>
    `;
}

// Get appropriate icon for sentiment
function getSentimentIcon(sentiment) {
    switch(sentiment) {
        case 'positive':
            return 'fa-thumbs-up';
        case 'negative':
            return 'fa-thumbs-down';
        default:
            return 'fa-question-circle';
    }
}

// Show error message
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Hide error message
function hideError() {
    errorElement.style.display = 'none';
}
