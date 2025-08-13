interface LogEntry {
  timestamp: string;
  action: 'encrypt' | 'decrypt';
  inputText: string;
  outputText: string;
  passwordUsed: boolean;
  success: boolean;
  language: 'english' | 'roman_urdu' | 'mixed';
  userAgent?: string;
}

class ActivityLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Limit to prevent memory issues

  private detectLanguage(text: string): 'english' | 'roman_urdu' | 'mixed' {
    // Simple detection based on common Roman Urdu words
    const romanUrduWords = [
      'aap', 'main', 'hum', 'tum', 'kaise', 'kya', 'hai', 'hain', 'hoon', 'ho',
      'mera', 'tera', 'uska', 'humara', 'tumhara', 'unka', 'se', 'ko', 'ka',
      'ki', 'ke', 'mein', 'par', 'or', 'aur', 'lekin', 'phir', 'wahan', 'yahan',
      'kab', 'kahan', 'kyun', 'kaise', 'kitna', 'kitni', 'kitne', 'theek', 'acha',
      'bura', 'sach', 'jhoot', 'pani', 'khana', 'ghar', 'school', 'office'
    ];

    const words = text.toLowerCase().split(/\s+/);
    const romanUrduCount = words.filter(word => 
      romanUrduWords.some(urduWord => word.includes(urduWord))
    ).length;

    const totalWords = words.length;
    const romanUrduPercentage = (romanUrduCount / totalWords) * 100;

    if (romanUrduPercentage > 30) return 'roman_urdu';
    if (romanUrduPercentage > 10) return 'mixed';
    return 'english';
  }

  logActivity(
    action: 'encrypt' | 'decrypt',
    inputText: string,
    outputText: string,
    passwordUsed: boolean,
    success: boolean
  ) {
    // Send to server-side logging
    if (typeof window !== 'undefined') {
      fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          inputText,
          outputText,
          passwordUsed,
          success
        })
      }).catch(error => {
        console.warn('Could not log activity to server:', error);
      });
    }

    // Also keep local copy for basic stats (limited data)
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      action,
      inputText: '', // Don't store locally for privacy
      outputText: success ? 'Success' : 'Failed',
      passwordUsed,
      success,
      language: this.detectLanguage(inputText),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    };

    this.logs.unshift(logEntry);
    
    // Keep only basic stats locally
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(0, 50);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getStats() {
    const totalOperations = this.logs.length;
    const successfulOperations = this.logs.filter(log => log.success).length;
    const encryptOperations = this.logs.filter(log => log.action === 'encrypt').length;
    const decryptOperations = this.logs.filter(log => log.action === 'decrypt').length;
    const romanUrduUsage = this.logs.filter(log => log.language === 'roman_urdu').length;
    const englishUsage = this.logs.filter(log => log.language === 'english').length;
    const mixedUsage = this.logs.filter(log => log.language === 'mixed').length;

    return {
      totalOperations,
      successfulOperations,
      successRate: totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 0,
      encryptOperations,
      decryptOperations,
      languageStats: {
        romanUrdu: romanUrduUsage,
        english: englishUsage,
        mixed: mixedUsage
      }
    };
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('textToEmojiLogs');
    }
  }

  // Load logs from localStorage on initialization
  loadLogs() {
    if (typeof window !== 'undefined') {
      try {
        const savedLogs = localStorage.getItem('textToEmojiLogs');
        if (savedLogs) {
          this.logs = JSON.parse(savedLogs);
        }
      } catch (error) {
        console.warn('Could not load logs from localStorage:', error);
      }
    }
  }
}

// Create singleton instance
export const activityLogger = new ActivityLogger();

// Load existing logs when the module is imported
if (typeof window !== 'undefined') {
  activityLogger.loadLogs();
}
