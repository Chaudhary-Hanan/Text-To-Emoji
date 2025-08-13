import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_KEY || 'your-secret-admin-key';

    if (authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!APPS_SCRIPT_URL) {
      return NextResponse.json({ error: 'Apps Script URL not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit') || '100';

    const targetUrl = `${APPS_SCRIPT_URL}?mode=logs&limit=${encodeURIComponent(limitParam)}&key=${encodeURIComponent(adminKey)}`;

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

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}


