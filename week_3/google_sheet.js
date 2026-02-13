// Google Apps Script – Updated to accept and store action_taken column

function doPost(e) {
  try {
    // Get data from POST request
    const jsonData = JSON.parse(e.postData.contents);
    
    // Open active sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Prepare row data: ts_iso, review, sentiment, meta, action_taken
    const rowData = [
      jsonData.ts_iso,              // Timestamp
      jsonData.review,              // Review text
      jsonData.sentiment,            // Sentiment label + confidence
      jsonData.meta,                 // Meta info (JSON string)
      jsonData.action_taken          // NEW: Business action code
    ];
    
    // Append new row
    sheet.appendRow(rowData);
    
    // Return success
    return ContentService
      .createTextOutput(JSON.stringify({success: true, message: "Data logged successfully"}))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Return error
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false, 
        error: error.toString(),
        message: "Failed to log data"
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Health check endpoint
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "active",
      message: "Google Sheets Logger is running with action_taken column",
      endpoints: {
        POST: "Send data to log",
        GET: "Check service status"
      }
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run this function once from the Apps Script editor to set up the sheet headers.
 * It will clear existing data and create the required columns.
 */
function setupSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Define headers (5 columns)
  const headers = [
    "Timestamp (ts_iso)",
    "Review",
    "Sentiment (with confidence)",
    "Meta (client info)",
    "Action Taken"   // NEW column
  ];
  
  // Clear sheet and set headers
  sheet.clear();
  sheet.appendRow(headers);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#4a86e8");
  headerRange.setFontColor("#ffffff");
  
  // Set column widths
  sheet.setColumnWidth(1, 180); // Timestamp
  sheet.setColumnWidth(2, 400); // Review
  sheet.setColumnWidth(3, 150); // Sentiment
  sheet.setColumnWidth(4, 300); // Meta
  sheet.setColumnWidth(5, 150); // Action Taken
  
  return "Sheet setup completed with 5 columns!";
}
