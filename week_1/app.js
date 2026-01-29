// Глобальные переменные
let reviews = [];
let apiToken = '';

// DOM элементы
const analyzeBtn = document.getElementById('analyze-btn');
const reviewText = document.getElementById('review-text');
const sentimentResult = document.getElementById('sentiment-result');
const loadingElement = document.querySelector('.loading');
const errorElement = document.getElementById('error-message');
const apiTokenInput = document.getElementById('api-token');

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем отзывы из TSV файла
    loadReviews();
    
    // Настраиваем обработчики событий
    analyzeBtn.addEventListener('click', analyzeRandomReview);
    apiTokenInput.addEventListener('change', saveApiToken);
    
    // Загружаем сохраненный токен, если он существует
    const savedToken = localStorage.getItem('hfApiToken');
    if (savedToken) {
        apiTokenInput.value = savedToken;
        apiToken = savedToken;
    }
});

// Загрузка и парсинг TSV файла с помощью Papa Parse
function loadReviews() {
    console.log('Начинаю загрузку отзывов...');
    
    // Основной путь для GitHub Pages
    const basePath = window.location.hostname.includes('github.io') 
        ? window.location.pathname.split('/').slice(0, -1).join('/')
        : '';
    
    const tsvPath = `${basePath}/reviews_test.tsv`;
    console.log('Использую путь к файлу:', tsvPath || 'reviews_test.tsv');
    
    fetch(tsvPath || 'reviews_test.tsv')
        .then(response => {
            if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
            return response.text();
        })
        .then(tsvData => {
            Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',
                skipEmptyLines: true,
                complete: (results) => {
                    reviews = results.data
                        .map(row => row.text)
                        .filter(text => text && text.trim() !== '');
                    console.log(`Загружено ${reviews.length} отзывов`);
                },
                error: (error) => {
                    console.error('Ошибка парсинга:', error);
                    showError('Не удалось обработать файл с отзывами');
                }
            });
        })
        .catch(error => {
            console.error('Ошибка загрузки файла:', error);
            // Fallback данные
            reviews = [
                "Very tasty chips, healthier alternative to regular chips without compromising on flavor.",
                "I just cannot understand the high praise these chips have received. All flavors have a weird taste.",
                "This product is great tasting! I was eating the pepitas at half the price.",
                "Gross! I took one bite and had to throw the bag away."
            ];
            console.log(`Использую ${reviews.length} fallback-отзывов`);
        });
}

// Сохраняем токен API в localStorage
function saveApiToken() {
    apiToken = apiTokenInput.value.trim();
    if (apiToken) {
        localStorage.setItem('hfApiToken', apiToken);
        console.log('Токен сохранен');
    } else {
        localStorage.removeItem('hfApiToken');
        console.log('Токен удален');
    }
}

// Анализ случайного отзыва
function analyzeRandomReview() {
    hideError();
    
    if (reviews.length === 0) {
        showError('Нет доступных отзывов. Пожалуйста, перезагрузите страницу.');
        return;
    }
    
    const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];
    reviewText.textContent = selectedReview;
    
    // Показываем состояние загрузки
    loadingElement.style.display = 'block';
    analyzeBtn.disabled = true;
    sentimentResult.innerHTML = '';
    sentimentResult.className = 'sentiment-result';
    
    // Анализируем тональность
    analyzeSentiment(selectedReview)
        .then(result => displaySentiment(result))
        .catch(error => {
            console.error('Ошибка анализа:', error);
            showError('Не удалось проанализировать тональность: ' + error.message);
        })
        .finally(() => {
            loadingElement.style.display = 'none';
            analyzeBtn.disabled = false;
        });
}

// Вызов Hugging Face API для анализа тональности
async function analyzeSentiment(text) {
    console.log('Отправляю запрос к Hugging Face API...');
    
    // Ключевое изменение: используем публичную CORS-прокси
    const proxyUrl = 'https://corsproxy.io/?';
    const apiUrl = 'https://api-inference.huggingface.co/models/distilbert/distilbert-base-uncased-finetuned-sst-2-english';
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': apiToken ? `Bearer ${apiToken}` : undefined
    };
    
    try {
        const response = await fetch(proxyUrl + encodeURIComponent(apiUrl), {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ inputs: text })
        });
        
        console.log('Статус ответа API:', response.status);
        
        if (!response.ok) {
            // Проверяем, является ли ошибка связанной с загрузкой модели
            if (response.status === 503) {
                const errorData = await response.json();
                if (errorData.error && errorData.error.includes('loading')) {
                    throw new Error('Модель загружается. Попробуйте через 10-20 секунд.');
                }
            }
            throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Успешный ответ API:', result);
        return result;
        
    } catch (error) {
        console.error('Ошибка сети/запроса:', error);
        throw error;
    }
}

// Отображение результата анализа тональности
function displaySentiment(result) {
    let sentiment = 'neutral';
    let score = 0.5;
    let label = 'NEUTRAL';
    
    console.log('Обрабатываю результат API:', result);
    
    // Парсим ответ API (формат: [[{label: 'POSITIVE', score: 0.99}]])
    if (Array.isArray(result) && result[0] && Array.isArray(result[0]) && result[0][0]) {
        const sentimentData = result[0][0];
        label = sentimentData.label?.toUpperCase() || 'NEUTRAL';
        score = sentimentData.score || 0.5;
        
        // Определяем тональность
        if (label === 'POSITIVE' && score > 0.5) {
            sentiment = 'positive';
        } else if (label === 'NEGATIVE' && score > 0.5) {
            sentiment = 'negative';
        }
        
        console.log('Распознанная тональность:', { label, score, sentiment });
    } else {
        console.warn('Неожиданный формат ответа API:', result);
    }
    
    // Обновляем интерфейс
    sentimentResult.classList.add(sentiment);
    sentimentResult.innerHTML = `
        <i class="fas ${getSentimentIcon(sentiment)} icon"></i>
        <span>${label} (уверенность: ${(score * 100).toFixed(1)}%)</span>
    `;
    
    // Анимация появления
    sentimentResult.style.opacity = '0';
    sentimentResult.style.transform = 'translateY(10px)';
    setTimeout(() => {
        sentimentResult.style.transition = 'all 0.3s ease';
        sentimentResult.style.opacity = '1';
        sentimentResult.style.transform = 'translateY(0)';
    }, 100);
}

// Получаем соответствующую иконку для тональности
function getSentimentIcon(sentiment) {
    switch(sentiment) {
        case 'positive': return 'fa-thumbs-up';
        case 'negative': return 'fa-thumbs-down';
        default: return 'fa-question-circle';
    }
}

// Показать сообщение об ошибке
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    console.error('Отображена ошибка:', message);
}

// Скрыть сообщение об ошибке
function hideError() {
    errorElement.style.display = 'none';
}
