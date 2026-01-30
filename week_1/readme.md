### Fix the issue of loading fake data!

---

#### STEP 1. Bug analysis prompt (role + requirements + expected output)

**Prompt**:
"You are an expert front-end developer analyzing a static sentiment analysis web app deployed on GitHub Pages. The app runs entirely in the browser (HTML + JavaScript only) and calls the Hugging Face Inference API at https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english from the origin https://shpilevalv.github.io. 

In the attached files you can find the full project structure and code from the repository https://github.com/ShpilevaLV/research_seminars/tree/main/week_1.

In the browser console yo see the following CORS error:
Access to fetch at 'https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english' from origin 'https://shpilevalv.github.io' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.

**Requirements**:
Consider that you cannot modify Hugging Face server settings and you cannot add any backend to my GitHub Pages app.
Assume the request is performed with fetch directly from the browser.

**Explain in detail**:
Why this CORS error happens in a frontend-only JavaScript app hosted on GitHub Pages?
Who controls and sends the CORS headers in this situation?
Whether this problem can be fully solved from the frontend side only, and why or why not?

**Expected output**:
A clear, structured explanation (1–3 paragraphs or a short bullet list) describing the root cause of the CORS error and the limitations of frontend-only fixes.
No code changes are required in this step, only reasoning."

---

#### STEP 2. Solution design prompt

**Prompt**:
"Suggest a frontend-only solution for a GitHub Pages sentiment analysis app to handle Hugging Face API CORS limitations.  

**Constraints**:  
- The solution must not use any backend, custom proxy, or server-side code.  
- The app must remain a static site (HTML + JavaScript only) hosted on GitHub Pages.  
- The UI should stay functional: the user clicks a button, sees a random review, and sees a sentiment result.

**Describe**:  
- Why typical CORS workarounds like custom proxies are not acceptable in this context.  
- How to keep the app usable by falling back to a mock sentiment result when the real Hugging Face request fails (for example, due to CORS).  
- How this behaviour should be integrated into the existing analyzeSentiment(text) flow.

**Expected output**:  
- A short, high-level design description (2–5 paragraphs or bullet points) explaining the chosen frontend-only approach, including the idea of returning fake data when the real API cannot be called successfully."

---

#### STEP 3. Code generation prompt

Prompt:
"Modify the analyzeSentiment function in app.js to gracefully handle Hugging Face API CORS errors, without changing any other parts of the app.

**Requirements**:  
- Keep the same function signature: async function analyzeSentiment(text).  
- First, try to call the Hugging Face Inference API using fetch as before.  
- Wrap the fetch and response handling in try/catch.  
- If the request fails for any reason (CORS error, network error, non-OK status), do not throw an error. Instead, return a mock response that matches the Hugging Face API output format:  
  [[{ label: 'POSITIVE', score: number }]]  
- The mock response should use valid labels (POSITIVE, NEGATIVE, NEUTRAL) and a score between 0.5 and 0.99.  
- The existing UI and displaySentiment function must continue to work without modification.

**Expected output**:  
- A single JavaScript code block with the updated implementation of analyzeSentiment, ready to be pasted into app.js, with no extra explanations outside the code block."

---

#### Step 4. Additional bug fixing

Prompt:
"Review this JavaScript fetch request used to call the Hugging Face Inference API and check if the Authorization header is correctly formatted as a Bearer token:

`async function analyzeSentiment(text) {
    const url = "https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english";
    const headers = {
        "Content-Type": "application/json"
    };
    if (apiToken) headers["Authorization"] = Bearer ${apiToken};

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ inputs: text })
        });

        if (!response.ok) {
            throw new Error(API error: ${response.status} ${response.statusText});
        }

        // Expected HF format: [[{label: "POSITIVE", score: 0.99}]]
        return await response.json();
    } catch (error) {
        console.warn("Falling back to fake sentiment due to network/CORS issue:", error);

        // Simple local fake sentiment generator
        const random = Math.random();
        let label = "NEUTRAL";
        let score = 0.5;
        if (random > 0.66) { label = "POSITIVE"; score = 0.95; }
        else if (random < 0.33) { label = "NEGATIVE"; score = 0.90; }

        return [[{ label, score }]];
    }
}`

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
