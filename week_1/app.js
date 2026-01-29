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
    // Load the TSV file (Papa Parse 활성화)
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
    console.log('Starting to load reviews...');
    
    // Определяем путь к файлу в зависимости от окружения
    let tsvPath;
    
    // Если мы на GitHub Pages
    if (window.location.hostname.includes('github.io')) {
        // Используем относительный путь от корня сайта
        const pathSegments = window.location.pathname.split('/');
        // Убираем последний сегмент (index.html или пустая строка)
        const basePath = pathSegments.slice(0, -1).join('/');
        tsvPath = `${basePath}/reviews_test.tsv`;
        console.log('GitHub Pages path:', tsvPath);
    } else {
        // Локальная разработка - относительный путь
        tsvPath = 'reviews_test.tsv';
        console.log('Local development path:', tsvPath);
    }
    
    // Попытка 1: Загрузка с относительного пути
    fetch(tsvPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load TSV file: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(tsvData => {
            console.log('TSV file loaded successfully');
            parseTSVData(tsvData);
        })
        .catch(error => {
            console.warn('First attempt failed:', error.message);
            console.log('Trying alternative path...');
            
            // Попытка 2: Альтернативный путь для GitHub Pages
            const altPath = '/research_seminars/week_1/reviews_test.tsv';
            fetch(altPath)
                .then(response => {
                    if (!response.ok) throw new Error(`Alternative path failed: ${response.status}`);
                    return response.text();
                })
                .then(tsvData => {
                    console.log('TSV file loaded from alternative path');
                    parseTSVData(tsvData);
                })
                .catch(error2 => {
                    console.error('Both attempts failed:', error2.message);
                    showError('Failed to load reviews data. Please check console for details.');
                    
                    // Используем тестовые данные как fallback
                    console.log('Using fallback test data');
                    reviews = [
                        "Very tasty chips, healthier alternative to regular chips without compromising on flavor.",
                        "I just cannot understand the high praise these chips have received. All flavors have a really weird taste.",
                        "This product is great tasting! I was eating the pepitas at half the price.",
                        "Gross! I took one bite and had to throw the bag away."
                    ];
                    console.log('Loaded', reviews.length, 'fallback reviews');
                });
        });
}

// Функция для парсинга TSV данных
function parseTSVData(tsvData) {
    Papa.parse(tsvData, {
        header: true,
        delimiter: '\t',
        skipEmptyLines: true,
        complete: (results) => {
            if (results.data && results.data.length > 0) {
                reviews = results.data
                    .map(row => row.text)
                    .filter(text => text && text.trim() !== '');
                console.log('Successfully parsed', reviews.length, 'reviews from TSV');
                console.log('Sample review:', reviews[0]);
            } else {
                console.warn('No data found in TSV file');
                showError('No review data found in the file.');
            }
        },
        error: (error) => {
            console.error('TSV parse error:', error);
            showError('Failed to parse TSV file: ' + error.message);
        }
    });
}

// Save API token to localStorage
function saveApiToken() {
    apiToken = apiTokenInput.value.trim();
    if (apiToken) {
        localStorage.setItem('hfApiToken', apiToken);
        console.log('API token saved');
    } else {
        localStorage.removeItem('hfApiToken');
        console.log('API token removed');
    }
}

// Analyze a random review
function analyzeRandomReview() {
    hideError();
    
    if (reviews.length === 0) {
        showError('No reviews available. Please try reloading the page.');
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * reviews.length);
    const selectedReview = reviews[randomIndex];
    
    console.log('Selected review index:', randomIndex, 'length:', selectedReview.length);
    
    // Display the review
    reviewText.textContent = selectedReview;
    
    // Show loading state
    loadingElement.style.display = 'block';
    analyzeBtn.disabled = true;
    sentimentResult.innerHTML = '';  // Reset previous result
    sentimentResult.className = 'sentiment-result';  // Reset classes
    
    // Call Hugging Face API
    analyzeSentiment(selectedReview)
        .then(result => {
            console.log('API response:', result);
            displaySentiment(result);
        })
        .catch(error => {
            console.error('Error analyzing sentiment:', error);
            showError('Failed to analyze sentiment: ' + error.message);
        })
        .finally(() => {
            loadingElement.style.display = 'none';
            analyzeBtn.disabled = false;
        });
}

// Call Hugging Face API for sentiment analysis
async function analyzeSentiment(text) {
    console.log('Sending request to Hugging Face API...');
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Добавляем Authorization header только если токен предоставлен
    if (apiToken && apiToken.startsWith('hf_')) {
        headers['Authorization'] = `Bearer ${apiToken}`;
        console.log('Using API token');
    } else {
        console.log('No API token provided, using public access');
    }
    
    const response = await fetch(
        'https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english',
        {
            headers: headers,
            method: 'POST',
            body: JSON.stringify({ inputs: text }),
        }
    );
    
    console.log('API response status:', response.status, response.statusText);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('API error details:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}. ${errorText}`);
    }
    
    const result = await response.json();
    return result;
}

// Display sentiment result
function displaySentiment(result) {
    // Default to neutral if we can't parse the result
    let sentiment = 'neutral';
    let score = 0.5;
    let label = 'NEUTRAL';
    
    console.log('Parsing API result:', result);
    
    // Parse the API response (format: [[{label: 'POSITIVE', score: 0.99}]])
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
        
        console.log('Parsed sentiment:', { label, score, sentiment });
    } else {
        console.warn('Unexpected API response format:', result);
    }
    
    // Update UI
    sentimentResult.classList.add(sentiment);
    sentimentResult.innerHTML = `
        <i class="fas ${getSentimentIcon(sentiment)} icon"></i>
        <span>${label} (${(score * 100).toFixed(1)}% confidence)</span>
    `;
    
    // Анимируем появление результата
    sentimentResult.style.opacity = '0';
    sentimentResult.style.transform = 'translateY(10px)';
    setTimeout(() => {
        sentimentResult.style.transition = 'all 0.3s ease';
        sentimentResult.style.opacity = '1';
        sentimentResult.style.transform = 'translateY(0)';
    }, 100);
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
    console.error('Error displayed:', message);
}

// Hide error message
function hideError() {
    errorElement.style.display = 'none';
}
