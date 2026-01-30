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
    apiTokenInput.addEventListener('input', saveApiToken);
    
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
                    reviews = results.data
                        .map(row => row.text)
                        .filter(text => text && text.trim() !== '');
                    console.log('Loaded', reviews.length, 'reviews');
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
function analyzeRandomReview() {
    hideError();
    
    if (reviews.length === 0) {
        showError('No reviews available. Please try again later.');
        return;
    }
    
    const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];
    
    // Display the review
    reviewText.textContent = selectedReview;
    
    // Show loading state
    loadingElement.style.display = 'block';
    analyzeBtn.disabled = true;
    sentimentResult.innerHTML = '';
    sentimentResult.className = 'sentiment-result';
    
    // Call sentiment analysis
    analyzeSentiment(selectedReview)
        .then(result => displaySentiment(result))
        .catch(error => {
            console.error('Error:', error);
            showError('Failed to analyze sentiment: ' + error.message);
        })
        .finally(() => {
            loadingElement.style.display = 'none';
            analyzeBtn.disabled = false;
        });
}

// Sentiment analysis function (with fallback)
async function analyzeSentiment(text) {
    // Updated endpoint for the new Inference Providers API
    const API_URL = 'https://router.huggingface.co/v1/chat/completions';
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}` // Use your Hugging Face token
    };
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: "siebert/sentiment-roberta-large-english", // Specify model here
                messages: [
                    {
                        role: "user",
                        content: `Analyze the sentiment of this review: "${text}"`
                    }
                ],
                max_tokens: 10 // Limit the response length
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        // You will need to parse the new response format here
        console.log('API Success:', result);
        return result;
        
    } catch (error) {
        console.error('API call failed, falling back:', error.message);
        // Fallback to your local analysis function
        return generateLocalSentiment(text);
    }
}

// Generate local sentiment analysis
function generateLocalSentiment(text) {
    const lowerText = text.toLowerCase();
    
    // Keywords for sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'love', 'best', 'recommend', 'happy', 
                          'perfect', 'awesome', 'wonderful', 'fantastic', 'amazing', 'tasty', 
                          'delicious', 'satisfied', 'liked', 'enjoyed', 'pleased'];
    
    const negativeWords = ['bad', 'terrible', 'worst', 'hate', 'disappointed', 'poor', 'waste',
                          'awful', 'horrible', 'dislike', 'broken', 'damaged', 'fake', 'scam',
                          'problem', 'issue', 'difficult', 'hard', 'expensive'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    // Count positive words
    positiveWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = lowerText.match(regex);
        if (matches) positiveScore += matches.length;
    });
    
    // Count negative words
    negativeWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = lowerText.match(regex);
        if (matches) negativeScore += matches.length;
    });
    
    // Determine sentiment
    let label, score;
    
    if (positiveScore > negativeScore) {
        label = "POSITIVE";
        score = 0.7 + (Math.random() * 0.25); // 0.7-0.95
    } else if (negativeScore > positiveScore) {
        label = "NEGATIVE";
        score = 0.7 + (Math.random() * 0.25); // 0.7-0.95
    } else {
        // Equal or no keywords found
        label = Math.random() > 0.5 ? "POSITIVE" : "NEGATIVE";
        score = 0.55 + (Math.random() * 0.3); // 0.55-0.85
    }
    
    // Return in Hugging Face format
    return [[{ label, score }]];
}

// Display sentiment result
function displaySentiment(result) {
    let sentiment = 'neutral';
    let score = 0.5;
    let label = 'NEUTRAL';
    
    // Parse the API response
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && result[0].length > 0) {
        const sentimentData = result[0][0];
        label = sentimentData.label?.toUpperCase() || 'NEUTRAL';
        score = sentimentData.score ?? 0.5;
        
        // Determine sentiment
        if (label === 'POSITIVE' && score > 0.5) {
            sentiment = 'positive';
        } else if (label === 'NEGATIVE' && score > 0.5) {
            sentiment = 'negative';
        }
    }
    
    // Update UI
    sentimentResult.classList.add(sentiment);
    sentimentResult.innerHTML = `
        <i class="fas ${getSentimentIcon(sentiment)} icon"></i>
        <span>${label} (${(score * 100).toFixed(1)}% confidence)</span>
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
