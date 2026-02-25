import { NextResponse } from 'next/server';

const BASE_URL = "https://api.xgateglobal.com";

export async function GET() {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    let accessLog = "";
    let errorLog = "";

    try {
        const { stdout } = await execPromise('grep "xgate" /var/log/nginx/access.log | tail -n 50');
        accessLog = stdout;
    } catch (e: any) {
        accessLog = "No matches or error reading access.log: " + e.message;
    }

    try {
        const { stdout } = await execPromise('grep "xgate" /var/log/nginx/error.log | tail -n 50');
        errorLog = stdout;
    } catch (e: any) {
        errorLog = "No matches or error reading error.log: " + e.message;
    }

    return new NextResponse(
        JSON.stringify({
            timestamp: new Date().toISOString(),
            accessLog: accessLog.split('\n').filter(Boolean),
            errorLog: errorLog.split('\n').filter(Boolean),
        }, null, 2),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}

// ── Webhook endpoint stub ─────────────────────────────────────────────────────
// Add a POST handler so we can see if XGate calls back our webhook at this URL
export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    console.log('[xgate-debug WEBHOOK]', JSON.stringify(body));
    // Echo back so we know it arrived
    return NextResponse.json({
        received: true,
        timestamp: new Date().toISOString(),
        body,
    });
}
