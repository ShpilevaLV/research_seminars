// Global variables
let reviews = [];
let apiToken = '';
let cache = new Map();

// DOM elements
const analyzeBtn = document.getElementById('analyze-btn');
const localAnalyzeBtn = document.getElementById('local-analyze-btn');
const reviewText = document.getElementById('review-text');
const sentimentResult = document.getElementById('sentiment-result');
const loadingElement = document.querySelector('.loading');
const loadingText = document.getElementById('loading-text');
const errorElement = document.getElementById('error-message');
const localFallback = document.getElementById('local-fallback');
const apiTokenInput = document.getElementById('api-token');

// List of available proxies (fallback chain)
const PROXIES = [
    '', // Direct connection (if CORS allows)
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/'
];

// Positive and negative keywords for local analysis
const POSITIVE_KEYWORDS = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'perfect',
    'love', 'like', 'best', 'awesome', 'recommend', 'happy', 'satisfied', 'pleased',
    'tasty', 'delicious', 'fresh', 'quality', 'easy', 'helpful', 'working', 'nice',
    'fast', 'reliable', 'comfortable', 'beautiful', 'clean', 'soft', 'smooth'
];

const NEGATIVE_KEYWORDS = [
    'bad', 'poor', 'terrible', 'awful', 'horrible', 'worst', 'waste', 'disappointed',
    'hate', 'dislike', 'avoid', 'broken', 'damaged', 'defective', 'fake', 'scam',
    'expensive', 'overpriced', 'slow', 'difficult', 'complicated', 'useless',
    'dirty', 'noisy', 'hard', 'rough', 'cheap', 'wrong', 'missing', 'problem'
];

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Load the TSV file
    loadReviews();
    
    // Set up event listeners
    analyzeBtn.addEventListener('click', () => analyzeRandomReview(true));
    localAnalyzeBtn.addEventListener('click', () => analyzeRandomReview(false));
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
function analyzeRandomReview(useAPI = true) {
    hideError();
    localFallback.style.display = 'none';
    
    if (reviews.length === 0) {
        showError('No reviews available. Please try again later.');
        return;
    }
    
    const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];
    
    // Display the review
    reviewText.textContent = selectedReview;
    
    // Check cache first
    const cacheKey = selectedReview.substring(0, 100);
    if (cache.has(cacheKey) && useAPI) {
        displaySentiment(cache.get(cacheKey));
        return;
    }
    
    // Show loading state
    loadingElement.style.display = 'block';
    loadingText.textContent = useAPI ? 'Analyzing with AI...' : 'Analyzing locally...';
    analyzeBtn.disabled = true;
    localAnalyzeBtn.disabled = true;
    sentimentResult.innerHTML = '';
    sentimentResult.className = 'sentiment-result';
    
    if (useAPI) {
        // Try Hugging Face API with proxy fallback
        analyzeWithHuggingFace(selectedReview)
            .then(result => {
                cache.set(cacheKey, result);
                displaySentiment(result);
            })
            .catch(error => {
                console.warn('API failed, falling back to local analysis:', error);
                localFallback.style.display = 'block';
                return analyzeLocally(selectedReview);
            })
            .then(result => {
                if (result) displaySentiment(result);
            })
            .catch(error => {
                console.error('All analysis methods failed:', error);
                showError('Analysis failed: ' + error.message);
            })
            .finally(() => {
                loadingElement.style.display = 'none';
                analyzeBtn.disabled = false;
                localAnalyzeBtn.disabled = false;
            });
    } else {
        // Use local analysis immediately
        setTimeout(() => {
            analyzeLocally(selectedReview)
                .then(result => displaySentiment(result))
                .catch(error => showError('Local analysis failed: ' + error.message))
                .finally(() => {
                    loadingElement.style.display = 'none';
                    analyzeBtn.disabled = false;
                    localAnalyzeBtn.disabled = false;
                });
        }, 500); // Small delay for UX
    }
}

// Try Hugging Face API with multiple proxy fallbacks
async function analyzeWithHuggingFace(text) {
    const model = 'distilbert-base-uncased-finetuned-sst-2-english';
    const directUrl = `https://api-inference.huggingface.co/models/${model}`;
    
    let lastError = null;
    
    // Try each proxy in order
    for (const proxy of PROXIES) {
        try {
            const url = proxy ? proxy + encodeURIComponent(directUrl) : directUrl;
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (apiToken) {
                headers['Authorization'] = `Bearer ${apiToken}`;
            }
            
            loadingText.textContent = `Trying API connection... (${proxy ? 'with proxy' : 'direct'})`;
            
            const response = await fetchWithTimeout(url, {
                headers: headers,
                method: 'POST',
                body: JSON.stringify({ inputs: text }),
            }, 15000); // 15 second timeout
            
            if (!response.ok) {
                if (response.status === 503) {
                    // Model is loading, wait and retry
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    continue;
                }
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            lastError = error;
            console.warn(`Proxy ${proxy} failed:`, error.message);
            continue;
        }
    }
    
    throw lastError || new Error('All API attempts failed');
}

// Simple local sentiment analysis based on keywords
async function analyzeLocally(text) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const lowerText = text.toLowerCase();
            
            let positiveScore = 0;
            let negativeScore = 0;
            
            // Count positive keywords
            POSITIVE_KEYWORDS.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = lowerText.match(regex);
                if (matches) {
                    positiveScore += matches.length;
                }
            });
            
            // Count negative keywords
            NEGATIVE_KEYWORDS.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = lowerText.match(regex);
                if (matches) {
                    negativeScore += matches.length;
                }
            });
            
            // Simple scoring logic
            let label = 'NEUTRAL';
            let score = 0.5;
            
            if (positiveScore > negativeScore) {
                label = 'POSITIVE';
                score = 0.5 + (positiveScore / (positiveScore + negativeScore + 1)) * 0.5;
            } else if (negativeScore > positiveScore) {
                label = 'NEGATIVE';
                score = 0.5 + (negativeScore / (positiveScore + negativeScore + 1)) * 0.5;
            }
            
            // Simulate Hugging Face API response format
            resolve([{ label: label, score: Math.min(score, 0.99) }]);
        }, 1000);
    });
}

// Display sentiment result
function displaySentiment(result) {
    // Default to neutral
    let sentiment = 'neutral';
    let score = 0.5;
    let label = 'NEUTRAL';
    
    // Parse the API response
    if (Array.isArray(result)) {
        // Format: [{label: 'POSITIVE', score: 0.99}]
        const sentimentData = result[0];
        if (sentimentData && sentimentData.label) {
            label = sentimentData.label.toUpperCase();
            score = sentimentData.score || 0.5;
            
            // Determine sentiment
            if (label === 'POSITIVE' && score > 0.5) {
                sentiment = 'positive';
            } else if (label === 'NEGATIVE' && score > 0.5) {
                sentiment = 'negative';
            } else if (label === 'LABEL_0' || label === 'NEGATIVE') {
                // Some models use LABEL_0 for negative
                sentiment = score > 0.5 ? 'negative' : 'neutral';
                label = sentiment.toUpperCase();
            } else if (label === 'LABEL_1' || label === 'POSITIVE') {
                // Some models use LABEL_1 for positive
                sentiment = score > 0.5 ? 'positive' : 'neutral';
                label = sentiment.toUpperCase();
            }
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

// Helper function for fetch with timeout
function fetchWithTimeout(url, options, timeout = 10000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
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
