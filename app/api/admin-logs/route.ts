import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwGK6LLGkTUq1jCKHl5O7faZbdvGV0w5H19srok7wUxCMn0fW1gWBWgj-bygvZzMe0p/exec';
const rawUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
const APPS_SCRIPT_URL = rawUrl.startsWith('@') ? rawUrl.slice(1) : rawUrl;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    // Support both the env ADMIN_KEY and the known secret code for convenience
    const configuredKey = process.env.ADMIN_KEY || 'your-secret-admin-key';
    const adminKey = configuredKey || '$Hannan141';

    if (authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!APPS_SCRIPT_URL) {
      return NextResponse.json({ error: 'Apps Script URL not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit') || '100';

    const targetUrl = `${APPS_SCRIPT_URL}?mode=logs&limit=${encodeURIComponent(limitParam)}&key=${encodeURIComponent(configuredKey)}`;

    const resp = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    const text = await resp.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid response from Apps Script', raw: text }, { status: 502 });
    }

    // Normalize minimal responses
    if (!data.logs && !data.stats) {
      data = {
        logs: [],
        stats: {
          totalOperations: 0,
          successfulOperations: 0,
          successRate: 0,
          encryptOperations: 0,
          decryptOperations: 0,
          languageStats: { romanUrdu: 0, english: 0, mixed: 0 }
        },
        info: data
      };
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}


