interface LogEntry {
  action: 'encrypt' | 'decrypt';
  inputText: string;
  outputText: string;
  passwordUsed: boolean;
  success: boolean;
  language: string;
  inputLength: number;
  outputLength: number;
}

export class AppsScriptLogger {
  private webAppUrl: string;

  constructor(webAppUrl: string) {
    this.webAppUrl = webAppUrl;
    console.log('AppsScriptLogger initialized with URL:', webAppUrl ? 'SET' : 'NOT SET');
  }

  isConfigured(): boolean {
    return !!this.webAppUrl;
  }

  async logActivity(entry: LogEntry): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('Apps Script not configured. Skipping log entry.');
      return;
    }

    try {
      console.log('Attempting to log to Google Sheets via Apps Script...');
      
      const response = await fetch(this.webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Successfully logged to Google Sheets via Apps Script');
      } else {
        console.warn('Apps Script logging failed:', result.error);
      }
    } catch (error) {
      console.warn('Apps Script logging failed:', error);
    }
  }

  private detectLanguage(text: string): string {
    const urduPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const romanUrduPattern = /[aeiou]/i;
    
    if (urduPattern.test(text)) return 'Urdu';
    if (romanUrduPattern.test(text)) return 'Roman Urdu';
    return 'English';
  }

  createLogEntry(
    action: 'encrypt' | 'decrypt',
    inputText: string,
    outputText: string,
    passwordUsed: boolean,
    success: boolean
  ): LogEntry {
    return {
      action,
      inputText: this.truncateText(inputText, 100),
      outputText: this.truncateText(outputText, 100),
      passwordUsed,
      success,
      language: this.detectLanguage(inputText),
      inputLength: inputText.length,
      outputLength: outputText.length
    };
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

// Configuration
export const APPS_SCRIPT_CONFIG = {
  WEB_APP_URL:
    process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbwGK6LLGkTUq1jCKHl5O7faZbdvGV0w5H19srok7wUxCMn0fW1gWBWgj-bygvZzMe0p/exec'
};

console.log('Apps Script environment variables loaded:', {
  WEB_APP_URL: APPS_SCRIPT_CONFIG.WEB_APP_URL ? 'SET' : 'NOT SET'
});

export const appsScriptLogger = new AppsScriptLogger(APPS_SCRIPT_CONFIG.WEB_APP_URL);
