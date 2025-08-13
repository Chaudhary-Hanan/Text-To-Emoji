# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets integration to automatically log all user activity from your text-to-emoji converter.

## 📋 What Gets Logged

Each log entry includes:
- **Timestamp** - When the action occurred
- **Action** - Encrypt or Decrypt
- **Input Text** - What the user entered (truncated to 100 chars)
- **Output Text** - Result (truncated to 100 chars)
- **Password Used** - Yes/No
- **Success** - Success/Failed
- **Language** - English/Roman Urdu/Urdu (auto-detected)
- **Input Length** - Number of characters
- **Output Length** - Number of characters

## 🚀 Setup Steps

### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Text-to-Emoji Activity Logs"
4. In the first row (A1:I1), add these headers:
   ```
   Timestamp | Action | Input Text | Output Text | Password Used | Success | Language | Input Length | Output Length
   ```

### Step 2: Get Your Sheet ID

1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit`
3. Copy the `YOUR_SHEET_ID_HERE` part (it's a long string of letters and numbers)

### Step 3: Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the "Google Sheets API":
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### Step 4: Create API Key

1. In Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key
4. (Optional) Restrict the API key to Google Sheets API only

### Step 5: Configure Environment Variables

1. Open your `.env.local` file
2. Add these lines:
   ```
   NEXT_PUBLIC_GOOGLE_SHEET_ID=your_sheet_id_here
   NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key_here
   ```

### Step 6: Test the Integration

1. Restart your development server
2. Try encrypting/decrypting some text
3. Check your Google Sheet - you should see new rows being added automatically

## 🔒 Privacy & Security

- **Private by Default**: Your Google Sheet is private and only you can access it
- **Truncated Data**: Long texts are truncated to 100 characters to prevent overly large entries
- **No Passwords**: Actual passwords are never logged, only whether one was used
- **Secure API**: Uses Google's official API with proper authentication

## 📊 Sample Data Structure

Your sheet will look like this:

| Timestamp | Action | Input Text | Output Text | Password Used | Success | Language | Input Length | Output Length |
|-----------|--------|------------|-------------|---------------|---------|----------|--------------|---------------|
| 2024-01-15T10:30:00Z | encrypt | Hello world! | 😀😃😄😁😆... | Yes | Success | English | 12 | 45 |
| 2024-01-15T10:31:00Z | decrypt | 😀😃😄😁😆... | Hello world! | Yes | Success | English | 45 | 12 |

## 🛠️ Troubleshooting

### If logs aren't appearing:
1. Check that your API key is correct
2. Verify the sheet ID is correct
3. Make sure the Google Sheets API is enabled
4. Check browser console for any error messages

### If you get API errors:
1. Ensure your API key has access to Google Sheets API
2. Check that your sheet is accessible (not deleted/renamed)
3. Verify the sheet has the correct headers in row 1

## 📈 Analytics You Can Do

With this data, you can:
- Track usage patterns
- Monitor success/failure rates
- Analyze language preferences
- See peak usage times
- Identify common issues

## 🔄 Automatic Logging

Once set up, the system will automatically log:
- ✅ All encryption attempts (successful and failed)
- ✅ All decryption attempts (successful and failed)
- ✅ Language detection
- ✅ Input/output lengths
- ✅ Timestamp of each action

No manual intervention required! 🎉
