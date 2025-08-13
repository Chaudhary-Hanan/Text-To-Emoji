import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  action: 'encrypt' | 'decrypt';
  inputText: string;
  outputText: string;
  passwordUsed: boolean;
  success: boolean;
  language: 'english' | 'roman_urdu' | 'mixed';
  userAgent?: string;
  ip?: string;
}

const LOGS_DIR = path.join(process.cwd(), 'logs');
const LOGS_FILE = path.join(LOGS_DIR, 'activity.json');

// Ensure logs directory exists
async function ensureLogsDir() {
  if (!existsSync(LOGS_DIR)) {
    await mkdir(LOGS_DIR, { recursive: true });
  }
}

// Read existing logs
async function readLogs(): Promise<LogEntry[]> {
  try {
    await ensureLogsDir();
    if (existsSync(LOGS_FILE)) {
      const data = await readFile(LOGS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
}

// Write logs to file
async function writeLogs(logs: LogEntry[]) {
  try {
    await ensureLogsDir();
    await writeFile(LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error writing logs:', error);
  }
}

// Detect language based on text content
function detectLanguage(text: string): 'english' | 'roman_urdu' | 'mixed' {
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

// POST: Add new log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, inputText, outputText, passwordUsed, success } = body;

    // Get client info
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'Unknown';

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      action,
      inputText: inputText.substring(0, 100), // Limit length for privacy
      outputText: success ? `${outputText.substring(0, 50)}...` : 'Failed',
      passwordUsed,
      success,
      language: detectLanguage(inputText),
      userAgent,
      ip
    };

    const logs = await readLogs();
    logs.unshift(logEntry); // Add to beginning

    // Keep only the most recent 1000 logs
    if (logs.length > 1000) {
      logs.splice(1000);
    }

    // Try to persist locally (works in dev; not persistent on Netlify)
    await writeLogs(logs);

    // Also forward to Google Apps Script (source of truth when deployed)
    const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';
    if (APPS_SCRIPT_URL) {
      const normalizedLanguage =
        logEntry.language === 'roman_urdu' ? 'Roman Urdu' :
        logEntry.language === 'mixed' ? 'Mixed' : 'English';

      const payload = {
        action,
        inputText: inputText.substring(0, 100),
        outputText: success ? outputText.substring(0, 100) : '',
        passwordUsed: !!passwordUsed,
        success: !!success,
        language: normalizedLanguage,
        inputLength: inputText.length,
        outputLength: (outputText || '').length
      };

      try {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store'
        });
      } catch (err) {
        console.warn('Apps Script forward failed:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json({ success: false, error: 'Failed to log activity' }, { status: 500 });
  }
}

// GET: Retrieve logs (admin only)
export async function GET(request: NextRequest) {
  try {
    // Simple admin authentication (you can enhance this)
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_KEY || 'your-secret-admin-key';
    
    if (authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await readLogs();
    
    // Calculate statistics
    const totalOperations = logs.length;
    const successfulOperations = logs.filter(log => log.success).length;
    const encryptOperations = logs.filter(log => log.action === 'encrypt').length;
    const decryptOperations = logs.filter(log => log.action === 'decrypt').length;
    const romanUrduUsage = logs.filter(log => log.language === 'roman_urdu').length;
    const englishUsage = logs.filter(log => log.language === 'english').length;
    const mixedUsage = logs.filter(log => log.language === 'mixed').length;

    const stats = {
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

    return NextResponse.json({
      logs: logs.slice(0, 100), // Return only first 100 for performance
      stats
    });
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return NextResponse.json({ error: 'Failed to retrieve logs' }, { status: 500 });
  }
}
