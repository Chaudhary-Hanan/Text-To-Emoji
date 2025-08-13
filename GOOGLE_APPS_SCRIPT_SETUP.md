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
4. Replace the default code with this (includes doGet with logs export for admin dashboard):

```javascript
const SHEET_NAME = 'Sheet1';
const ADMIN_KEY = '0502'; // optional: change and keep in sync with your site env

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Sheet not found');

    const rowData = [
      new Date(),
      data.action,
      data.inputText,
      data.outputText,
      data.passwordUsed ? 'Yes' : 'No',
      data.success ? 'Yes' : 'No',
      data.language,
      data.inputLength,
      data.outputLength
    ];

    sheet.appendRow(rowData);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const mode = (e && e.parameter && e.parameter.mode) || 'ping';
    if (mode === 'ping') {
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, message: 'Text-to-Emojis Logger is running' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (mode === 'logs') {
      const key = (e && e.parameter && e.parameter.key) || '';
      if (key !== ADMIN_KEY) {
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const limit = parseInt((e && e.parameter && e.parameter.limit) || '100', 10);
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      if (!sheet) throw new Error('Sheet not found');

      const lastRow = sheet.getLastRow();
      const header = sheet.getRange(1, 1, 1, 9).getValues()[0];
      const rowsToRead = Math.min(limit, Math.max(0, lastRow - 1));
      const range = sheet.getRange(Math.max(2, lastRow - rowsToRead + 1), 1, rowsToRead, 9);
      const values = rowsToRead > 0 ? range.getValues() : [];

      const logs = values.reverse().map(r => ({
        timestamp: r[0],
        action: String(r[1]).toLowerCase(),
        inputText: r[2],
        outputText: r[3],
        passwordUsed: String(r[4]).toLowerCase() === 'yes',
        success: String(r[5]).toLowerCase() === 'yes',
        language: String(r[6]).toLowerCase().replace(' ', '_'),
        inputLength: Number(r[7]) || 0,
        outputLength: Number(r[8]) || 0
      }));

      // Basic stats
      const totalOperations = logs.length;
      const successfulOperations = logs.filter(l => l.success).length;
      const encryptOperations = logs.filter(l => l.action === 'encrypt').length;
      const decryptOperations = logs.filter(l => l.action === 'decrypt').length;
      const languageStats = {
        romanUrdu: logs.filter(l => l.language === 'roman urdu' || l.language === 'roman_urdu').length,
        english: logs.filter(l => l.language === 'english').length,
        mixed: logs.filter(l => l.language === 'mixed').length
      };

      return ContentService
        .createTextOutput(JSON.stringify({
          logs,
          stats: {
            totalOperations,
            successfulOperations,
            successRate: totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 0,
            encryptOperations,
            decryptOperations,
            languageStats
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unknown mode' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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

1. Open your `.env.local` file (or Netlify Site settings → Environment)
2. Replace `your_google_apps_script_web_app_url_here` with the actual URL you copied
3. The line should look like:
   ```
   NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ADMIN_KEY=0502
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
4. The admin dashboard will pull logs from your Google Sheet via Apps Script when deployed (Netlify)

The Apps Script integration will work alongside the existing local logging system, providing you with both immediate access to data (admin dashboard) and long-term storage (Google Sheets).
