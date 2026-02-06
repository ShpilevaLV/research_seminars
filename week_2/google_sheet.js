// Google Apps Script код для обработки запросов и записи в Google Sheets

function doPost(e) {
  try {
    // Get data from POST request
    const jsonData = JSON.parse(e.postData.contents);
    
    // Open current table
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Preparing data for record
    const rowData = [
      jsonData.ts_iso,              // Timestamp (ts_iso)
      jsonData.review,              // Review
      jsonData.sentiment,           // Sentiment (with confidence)
      jsonData.meta                 // Meta (all information from client)
    ];
    
    // Make a new string
    sheet.appendRow(rowData);
    
    // Return success answer
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
  // Check that everything works correct
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "active",
      message: "Google Sheets Logger is running",
      endpoints: {
        POST: "Send data to log",
        GET: "Check service status"
      }
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Function for colums headers 
function setupSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Setup colums headers 
  const headers = [
    "Timestamp (ts_iso)",
    "Review",
    "Sentiment (with confidence)",
    "Meta (this includes all information from the client)"
  ];
  
  // Clean our google sheet and setup colums headers
  sheet.clear();
  sheet.appendRow(headers);
  
  // Formating headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#4a86e8");
  headerRange.setFontColor("#ffffff");
  
  // Colums weight
  sheet.setColumnWidth(1, 180); // Timestamp
  sheet.setColumnWidth(2, 400); // Review
  sheet.setColumnWidth(3, 150); // Sentiment
  sheet.setColumnWidth(4, 300); // Meta
  
  return "Sheet setup completed!";
}
