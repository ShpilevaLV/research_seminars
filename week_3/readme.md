## Role  
You are an expert web developer. Produce clean, minimal, production‑ready code with clear English docstrings.

***

## Context  
Take the existing sentiment analysis web app (GitHub Pages static site using transformers.js for local inference) and upgrade it to an automated decision system that maps sentiment to business actions, displays dynamic UI messages, and logs the action taken to Google Sheets.

Current app: https://shpilevalv.github.io/research_seminars/week_3/

Code: https://github.com/ShpilevaLV/research_seminars/tree/main/week_3

***

## Instruction  

Implement business logic, UI feedback, and enhanced logging based on the AI's sentiment analysis.

**The Scenario: "The Automatic Firefighter"**
- Negative (High Risk) → Apologize + offer coupon (OFFER_COUPON)
- Neutral / Low Confidence → Ask for feedback (REQUEST_FEEDBACK)
- Positive (High Confidence) → Ask for referral (ASK_REFERRAL)

**Required Columns in Google Sheets:**

1. Timestamp (ts_iso) - ISO timestamp
2. Review - the randomly selected review text
3. Sentiment (with confidence) - sentiment label with confidence percentage
4. Meta - JSON string with client metadata (browser, screen, model info, etc.)
5. Business action code - business action code (NEW!)

**Constraints:**

- Static GitHub Pages app (no backend except Google Apps Script)
- Use existing deployed Google Apps Script:
https://script.google.com/macros/s/AKfycbxI4Yx0rFmnFd19NewIoLCk28NECZFpemxkLNKzzXWhmtIzTIs77ljOeTo8tMpZY8nQ/exec
- Sentiment analysis stays local (transformers.js)
- Logging async, fail silently, CORS handled with mode: "no-cors"

**Deliver:**

1. Modified app.js – complete file with logging function and integrated business logic.
2. Google Apps Script code – complete .gs file that receives and stores the new action_taken column.
3. Setup steps – numbered list, concise.
4. Testing instructions – how to verify it works.

***

## Format  

Return the final answer in this exact order:

1. Modified app.js (complete file with changes)
2. Google Apps Script code (complete .gs file)
3. Setup steps (numbered list, concise)
4. Testing instructions (how to verify it works)
