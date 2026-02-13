// app.js (ES module version using transformers.js for local sentiment classification)
// UPDATED: Fixed label extraction for business logic

import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js";

// Global variables
let reviews = [];
let apiToken = "";
let sentimentPipeline = null;
let currentReview = "";

// DOM elements
const analyzeBtn = document.getElementById("analyze-btn");
const reviewText = document.getElementById("review-text");
const sentimentResult = document.getElementById("sentiment-result");
const actionResult = document.getElementById("action-result");
const loadingElement = document.querySelector(".loading");
const errorElement = document.getElementById("error-message");
const apiTokenInput = document.getElementById("api-token");
const statusElement = document.getElementById("status");

// Google Apps Script URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxI4Yx0rFmnFd19NewIoLCk28NECZFpemxkLNKzzXWhmtIzTIs77ljOeTo8tMpZY8nQ/exec";

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  loadReviews();
  analyzeBtn.addEventListener("click", analyzeRandomReview);
  apiTokenInput.addEventListener("change", saveApiToken);
  
  const savedToken = localStorage.getItem("hfApiToken");
  if (savedToken) {
    apiTokenInput.value = savedToken;
    apiToken = savedToken;
  }
  
  initSentimentModel();
});

// Initialize transformers.js sentiment model
async function initSentimentModel() {
  try {
    if (statusElement) {
      statusElement.textContent = "Loading sentiment model...";
    }
    
    sentimentPipeline = await pipeline(
      "text-classification",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    );
    
    if (statusElement) {
      statusElement.textContent = "Sentiment model ready";
    }
  } catch (error) {
    console.error("Failed to load sentiment model:", error);
    showError("Failed to load sentiment model. Please check your network connection and try again.");
    if (statusElement) {
      statusElement.textContent = "Model load failed";
    }
  }
}

// Load and parse the TSV file using Papa Parse
function loadReviews() {
  fetch("reviews_test.tsv")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load TSV file");
      }
      return response.text();
    })
    .then((tsvData) => {
      Papa.parse(tsvData, {
        header: true,
        delimiter: "\t",
        complete: (results) => {
          reviews = results.data
            .map((row) => row.text)
            .filter((text) => typeof text === "string" && text.trim() !== "");
          console.log("Loaded", reviews.length, "reviews");
        },
        error: (error) => {
          console.error("TSV parse error:", error);
          showError("Failed to parse TSV file: " + error.message);
        },
      });
    })
    .catch((error) => {
      console.error("TSV load error:", error);
      showError("Failed to load TSV file: " + error.message);
    });
}

// Save API token to localStorage
function saveApiToken() {
  apiToken = apiTokenInput.value.trim();
  if (apiToken) {
    localStorage.setItem("hfApiToken", apiToken);
  } else {
    localStorage.removeItem("hfApiToken");
  }
}

// --- BUSINESS LOGIC FUNCTION (Starter Code Snippet) ---
function determineBusinessAction(confidence, label) {
    // 1. Normalize Score: Map everything to a 0 (Worst) to 1 (Best) scale.
    let normalizedScore = 0.5;

    if (label === "POSITIVE") {
        normalizedScore = confidence;
    } else if (label === "NEGATIVE") {
        normalizedScore = 1.0 - confidence;
    }

    // 2. Apply Business Thresholds
    if (normalizedScore <= 0.4) {
        return {
            actionCode: "OFFER_COUPON",
            uiMessage: "We are truly sorry. Please accept this 50% discount coupon.",
            uiColor: "#ef4444"
        };
    } else if (normalizedScore < 0.7) {
        return {
            actionCode: "REQUEST_FEEDBACK",
            uiMessage: "Thank you! Could you tell us how we can improve?",
            uiColor: "#6b7280"
        };
    } else {
        return {
            actionCode: "ASK_REFERRAL",
            uiMessage: "Glad you liked it! Refer a friend and earn rewards.",
            uiColor: "#3b82f6"
        };
    }
}

// Analyze a random review
function analyzeRandomReview() {
  hideError();

  if (!Array.isArray(reviews) || reviews.length === 0) {
    showError("No reviews available. Please try again later.");
    return;
  }

  if (!sentimentPipeline) {
    showError("Sentiment model is not ready yet. Please wait a moment.");
    return;
  }

  const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];
  currentReview = selectedReview;

  reviewText.textContent = selectedReview;

  loadingElement.style.display = "block";
  analyzeBtn.disabled = true;
  sentimentResult.innerHTML = "";
  sentimentResult.className = "sentiment-result";
  if (actionResult) {
    actionResult.style.display = "none";
    actionResult.innerHTML = "";
  }

  analyzeSentiment(selectedReview)
    .then((result) => {
      // --- FIX: Get the data from displaySentiment and use it ---
      const sentimentData = displaySentiment(result);
      
      // Now call the business logic with the CORRECT label and confidence
      const decision = determineBusinessAction(sentimentData.confidence, sentimentData.label);
      
      displayAction(decision);
      logToGoogleSheets(selectedReview, result, decision.actionCode);
      // --- END OF FIX ---
    })
    .catch((error) => {
      console.error("Error:", error);
      showError(error.message || "Failed to analyze sentiment.");
    })
    .finally(() => {
      loadingElement.style.display = "none";
      analyzeBtn.disabled = false;
    });
}

// Call local transformers.js pipeline for sentiment classification
async function analyzeSentiment(text) {
  if (!sentimentPipeline) {
    throw new Error("Sentiment model is not initialized.");
  }

  const output = await sentimentPipeline(text);

  if (!Array.isArray(output) || output.length === 0) {
    throw new Error("Invalid sentiment output from local model.");
  }

  return [output];
}

// Display sentiment result and RETURN the extracted data
function displaySentiment(result) {
  let sentimentBucket = "neutral";
  let score = 0.5;
  let label = "NEUTRAL";

  if (
    Array.isArray(result) &&
    result.length > 0 &&
    Array.isArray(result[0]) &&
    result[0].length > 0
  ) {
    const sentimentData = result[0][0];

    if (sentimentData && typeof sentimentData === "object") {
      label = typeof sentimentData.label === "string"
          ? sentimentData.label.toUpperCase()
          : "NEUTRAL";
      score = typeof sentimentData.score === "number"
          ? sentimentData.score
          : 0.5;

      if (label === "POSITIVE" && score > 0.5) {
        sentimentBucket = "positive";
      } else if (label === "NEGATIVE" && score > 0.5) {
        sentimentBucket = "negative";
      } else {
        sentimentBucket = "neutral";
      }
    }
  }

  // Update UI
  sentimentResult.classList.add(sentimentBucket);
  sentimentResult.innerHTML = `
        <i class="fas ${getSentimentIcon(sentimentBucket)} icon"></i>
        <span>${label} (${(score * 100).toFixed(1)}% confidence)</span>
    `;
  
  // --- IMPORTANT: Return the data needed for the next step ---
  return { label: label, confidence: score, bucket: sentimentBucket };
}

function displayAction(decision) {
  if (!actionResult) return;
  actionResult.style.display = "block";
  actionResult.style.backgroundColor = decision.uiColor + "20";
  actionResult.style.borderLeft = `4px solid ${decision.uiColor}`;
  actionResult.innerHTML = `
    <p style="color: ${decision.uiColor}; font-weight: bold; margin: 0;">
      <i class="fas fa-bolt" style="margin-right: 8px;"></i>
      ${decision.uiMessage}
    </p>
    <small style="color: #666;">Action: ${decision.actionCode}</small>
  `;
}

// Logging data to Google Sheets (Action column is already correct)
async function logToGoogleSheets(review, sentimentResult, actionTaken) {
  try {
    const sentimentData = sentimentResult[0][0];
    const label = sentimentData.label.toUpperCase();
    const score = sentimentData.score;
    const confidence = (score * 100).toFixed(1) + '%';
    
    const meta = {
      model: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
      inference_type: "local_transformers_js",
      timestamp: new Date().toISOString(),
      review_length: review.length,
      review_preview: review.substring(0, 100) + (review.length > 100 ? "..." : ""),
      client_info: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    const data = {
      ts_iso: new Date().toISOString(),
      review: review,
      sentiment: `${label} (${confidence})`,
      meta: JSON.stringify(meta),
      action_taken: actionTaken
    };

    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    console.log("Data logged to Google Sheets:", data);

  } catch (error) {
    console.error("Error logging to Google Sheets:", error);
  }
}

function getSentimentIcon(sentiment) {
  switch (sentiment) {
    case "positive": return "fa-thumbs-up";
    case "negative": return "fa-thumbs-down";
    default: return "fa-question-circle";
  }
}

function showError(message) {
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

function hideError() {
  errorElement.style.display = "none";
}
