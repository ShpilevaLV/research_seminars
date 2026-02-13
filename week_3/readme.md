## Role  
You are an expert web developer. Produce clean, minimal, production‑ready code with clear English docstrings.

***

## Context  
Take the existing sentiment analysis web app (GitHub Pages static site using transformers.js for local inference) and add automatic logging to Google Sheets.

Current app: https://shpilevalv.github.io/research_seminars/week_2/

Code: https://github.com/ShpilevaLV/research_seminars/tree/main/week_2

***

## Instruction  

**Modify the app to log every analysis to Google Sheets with these columns:**

1. Timestamp (ts_iso) - ISO timestamp
2. Review - the randomly selected review text
3. Sentiment (with confidence) - sentiment label with confidence percentage
4. Meta - JSON string with client metadata (browser, screen, model info, etc.)

**Constraints:**

- Must remain a static GitHub Pages app (no backend except Google Apps Script)
- Use existing deployed Google Apps Script: https://script.google.com/macros/s/AKfycbzjolVleqxtDQ8rMGMonANgyz8yIxrKamThRaq61IwroReQMiuBe7O-i3mNFDjMvmNJ/exec
- Sentiment analysis stays local (transformers.js)
- Logging must not break the user experience
- Handle CORS properly with mode: "no-cors"

**Deliver:**

1. Updated app.js with logging function
2. Google Apps Script code to receive and store data
3. Brief setup instructions

Make it production-ready with error handling. Logging should be async and fail silently if Google Sheets is unavailable.

***

## Format  

Return the final answer in this exact order:

1. Modified app.js (complete file with changes)
2. Google Apps Script code (complete .gs file)
3. Setup steps (numbered list, concise)
4. Testing instructions (how to verify it works)
