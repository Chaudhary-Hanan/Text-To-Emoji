# Google Apps Script Setup Guide

This guide will help you set up Google Apps Script to log user activities to Google Sheets in a secure and reliable way.

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it something like "Text-to-Emojis Activity Log"
4. In the first row (A1:I1), add these headers:
   ```
   Timestamp | Action | Input Text | Output Text | Password Used | Success | Language | Input Length | Output Length
   ```

## Step 2: Create Google Apps Script

1. Go to [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Name it "Text-to-Emojis Logger"
4. Replace the default code with this:

```javascript
function doPost(e) {
  try {
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Get the active spreadsheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Prepare the row data
    const rowData = [
      new Date(), // Timestamp
      data.action, // Action (encrypt/decrypt)
      data.inputText, // Input text (truncated)
      data.outputText, // Output text (truncated)
      data.passwordUsed ? 'Yes' : 'No', // Password used
      data.success ? 'Yes' : 'No', // Success
      data.language, // Language detected
      data.inputLength, // Input length
      data.outputLength // Output length
    ];
    
    // Append the data to the sheet
    sheet.appendRow(rowData);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Data logged successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ 
      success: true, 
      message: 'Text-to-Emojis Logger is running' 
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Step 3: Deploy as Web App

1. Click "Deploy" → "New deployment"
2. Choose "Web app" as the type
3. Set the following options:
   - **Execute as**: "Me" (your Google account)
   - **Who has access**: "Anyone" (for now, we'll secure it later)
4. Click "Deploy"
5. Click "Authorize access" and follow the prompts
6. Copy the **Web app URL** that appears

## Step 4: Update Your Environment Variables

1. Open your `.env.local` file
2. Replace `your_google_apps_script_web_app_url_here` with the actual URL you copied
3. The line should look like:
   ```
   NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```

## Step 5: Test the Integration

1. Restart your Next.js development server:
   ```bash
   npm run dev
   ```
2. Open your app and try encrypting/decrypting some text
3. Check your Google Sheet to see if the data is being logged
4. Check the browser console for any error messages

## Step 6: Security (Optional but Recommended)

To make your Apps Script more secure:

1. Go back to your Apps Script project
2. Click "Deploy" → "Manage deployments"
3. Click the pencil icon to edit your deployment
4. Change "Who has access" to "Anyone with Google Account"
5. Click "Update"

## Troubleshooting

### Common Issues:

1. **"Apps Script not configured" message**
   - Check that your `.env.local` file has the correct URL
   - Make sure you restarted the development server after updating the file

2. **"Apps Script logging failed" message**
   - Check that your Apps Script is deployed as a web app
   - Verify the URL in your environment variables
   - Check the Apps Script logs for errors

3. **Data not appearing in Google Sheets**
   - Make sure your Google Sheet is open and accessible
   - Check that the Apps Script has permission to access the sheet
   - Verify the sheet headers match exactly

4. **CORS errors**
   - This is normal for Apps Script - the logging will still work
   - The errors in console are expected and don't affect functionality

### Testing the Setup:

You can test if your Apps Script is working by visiting the URL directly in your browser. You should see:
```json
{"success":true,"message":"Text-to-Emojis Logger is running"}
```

## Benefits of This Approach

1. **More Secure**: No API keys exposed in client-side code
2. **More Reliable**: Apps Script handles rate limiting and quotas better
3. **Easier Setup**: No need for Google Cloud Console setup
4. **Better Privacy**: Data stays within your Google account
5. **Cost Effective**: Apps Script has generous free quotas

## Data Privacy

- Input and output text are truncated to 100 characters for privacy
- No passwords are logged
- Only basic metadata is stored (action type, success status, language, etc.)
- All data is stored in your own Google Sheet

## Next Steps

Once you've completed this setup:
1. Your app will automatically log all encryption/decryption attempts
2. You can view the data in your Google Sheet
3. You can export the data or create charts/analytics in Google Sheets
4. The admin dashboard will continue to work with local logs

The Apps Script integration will work alongside the existing local logging system, providing you with both immediate access to data (admin dashboard) and long-term storage (Google Sheets).
