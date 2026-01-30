### Fix the issue of loading fake data!

## Step 1. Bug analysis prompt

Prompt:
"Analyze this JavaScript code running on GitHub Pages.
The fetch request to Hugging Face Inference API fails with a CORS error.
Explain why this happens and whether it can be fixed on frontend-only side."

---

## Step 2. Solution design prompt

Prompt:
"Suggest a frontend-only solution for GitHub Pages to handle Hugging Face API CORS limitations.
The solution must not use any backend and should keep the UI functional."

---

## Step 3. Code generation prompt

Prompt:
"Modify the analyzeSentiment function to gracefully handle Hugging Face API CORS errors.
If the request fails, return a mock response that matches the HF API output format
[[{ label: 'POSITIVE', score: number }]]."

---

## Step 4. Additional bug fixing

Prompt:
"Review this JavaScript fetch request and check if Authorization header is correctly formatted."

---

### Prompt for Generating a Web App Code in DeepSeek Chat

**Objective:**  
You're an expert front-end developer. Create a complete, deployable web app for GitHub Pages that analyzes random product reviews from a TSV file using Hugging Face Inference API with a free sentiment analysis model. You MUST strictly follow all instructions without simplification or omission.

**Key Requirements (MUST IMPLEMENT EXACTLY):**
- **Files Structure:** Generate TWO separate files: `index.html` for UI (including styles and structure) and `app.js` for all logic. Do NOT combine them.
- **Data Handling:** MUST use Papa Parse library (via CDN: `<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>`) to parse "reviews_test.tsv" file via fetch. Do NOT use manual parsing or other methods. Assume TSV has a 'text' column for reviews.
- **User Input:** Include a text field in HTML for the user to enter their Hugging Face API token (optional for free tier, but include for rate limits).
- **Functionality:**
  - Load and parse the TSV using Papa Parse to extract an array of review texts.
  - On button click: Select a random review text, display it, and call Hugging Face Inference API for the model "siebert/sentiment-roberta-large-english" (free for sentiment classification) using the token (if provided) to analyze the review's sentiment (classify as positive, negative, or neutral based on score).
  - Based on the API response, display a thumbs-up icon for positive, thumbs-down for negative, or question mark for neutral.
- **Technical Details:**
  - Use `fetch` for API calls with the latest Hugging Face format (POST to `https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english`, body: { "inputs": reviewText }, optional Authorization header).
  - Handle errors gracefully (e.g., network errors, invalid token, API rate limits).
  - Ensure the app is pure HTML/JS (no server-side code). Use vanilla JavaScript.
  - Parse API response: [[{label: 'POSITIVE', score: number}]]. If score > 0.5 and label 'POSITIVE' → positive; 'NEGATIVE' → negative; else neutral.
  - Include Font Awesome via CDN for icons: `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">`.

**Output Format:**  
- Provide full code for `index.html` in a code block.  
- Provide full code for `app.js` in a separate code block.  
- Do NOT add extra explanations, comments, or code outside these blocks.
