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
    console.log('App loading...'); // Debug
    loadReviews();
    
    analyzeBtn.addEventListener('click', analyzeRandomReview);
    apiTokenInput.addEventListener('input', saveApiToken); // Changed to 'input'
    
    // Load saved API token
    const savedToken = localStorage.getItem('hfApiToken');
    if (savedToken) {
        apiTokenInput.value = savedToken;
        apiToken = savedToken;
    }
});

// ✅ ИСПРАВЛЕННАЯ загрузка TSV
function loadReviews() {
    console.log('Loading TSV...'); // Debug
    fetch('./reviews_test.tsv')  // ✅ Относительный путь
        .then(response => {
            console.log('TSV response status:', response.status); // Debug
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        })
        .then(tsvData => {
            console.log('TSV data length:', tsvData.length); // Debug
            Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',  // ✅ ПРАВИЛЬНО! Табуляция
                skipEmptyLines: true,
                complete: (results) => {
                    console.log('Parse results:', results); // Debug
                    reviews = results.data
                        .filter(row => row.text && row.text.trim())  // ✅ Фильтр с проверкой
                        .map(row => row.text.trim());
                    console.log(`✅ Loaded ${reviews.length} reviews`);
                    reviewText.textContent = `Loaded ${reviews.length} reviews. Click to analyze!`;
                },
                error: (error) => {
                    console.error('Papa parse error:', error);
                    showError('Failed to parse TSV: ' + error);
                }
            });
        })
        .catch(error => {
            console.error('Fetch/TSV error:', error);
            showError('Failed to load reviews_test.tsv: ' + error.message);
        });
}

function saveApiToken() {
    apiToken = apiTokenInput.value.trim();
    if (apiToken.startsWith('hf_')) {
        localStorage.setItem('hfApiToken', apiToken);
        console.log('Token saved');
    }
}

async function analyzeRandomReview() {
    hideError();
    
    if (reviews.length === 0) {
        showError('No reviews loaded. Check console (F12).');
        return;
    }
    
    const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];
    reviewText.textContent = selectedReview;
    
    loadingElement.style.display = 'block';
    analyzeBtn.disabled = true;
    sentimentResult.innerHTML = '';
    sentimentResult.className = 'sentiment-result';
    
    try {
        const result = await analyzeSentiment(selectedReview);
        displaySentiment(result);
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Failed to analyze: ' + error.message);
    } finally {
        loadingElement.style.display = 'none';
        analyzeBtn.disabled = false;
    }
}

async function analyzeSentiment(text) {
    console.log('Calling HF API...'); // Debug
    
    const headers = { 
        'Content-Type': 'application/json'
    };
    if (apiToken) {
        headers.Authorization = `Bearer ${apiToken}`;
    }
    
    try {
        const response = await fetch(
            'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english', // ✅ Быстрая модель
            {
                headers,
                method: 'POST',
                body: JSON.stringify({ inputs: text.slice(0, 512) }) // ✅ Обрезаем до 512 токенов
            }
        );
        
        console.log('API response status:', response.status); // Debug
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error details:', errorText);
            throw new Error(`API ${response.status}: ${errorText.slice(0,100)}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

function displaySentiment(result) {
    let sentiment = 'neutral';
    let score = 0.5;
    let label = 'NEUTRAL';
    
    if (Array.isArray(result) && result[0]?.[0]) {
        const data = result[0][0];
        label = data.label || 'NEUTRAL';
        score = data.score || 0.5;
        
        if (label === 'POSITIVE' && score > 0.5) sentiment = 'positive';
        else if (label === 'NEGATIVE') sentiment = 'negative';
    }
    
    sentimentResult.classList.add(sentiment);
    sentimentResult.innerHTML = `
        <i class="fas ${getSentimentIcon(sentiment)} icon"></i>
        <span>${label} (${(score * 100).toFixed(1)}%)</span>
    `;
}

function getSentimentIcon(sentiment) {
    return {
        positive: 'fa-thumbs-up',
        negative: 'fa-thumbs-down',
        neutral: 'fa-question-circle'
    }[sentiment] || 'fa-question-circle';
}

function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError() {
    errorElement.style.display = 'none';
}
