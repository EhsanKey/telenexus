import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_API_BASE } from '@/lib/proxy-handler';

function renderResultHtml(success: boolean, errMsg?: string): NextResponse {
  const safeError = errMsg || 'Unknown error during Google Drive authentication';
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${success ? 'Google Drive Connected' : 'Connection Failed'}</title>
  <style>
    body {
      background: #0B0E14;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
      user-select: none;
    }
    .card {
      background: #111827;
      border: 1px solid #1E293B;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      max-width: 420px;
    }
    .icon { font-size: 42px; margin-bottom: 12px; }
    h2 { font-size: 18px; margin: 0 0 8px 0; color: ${success ? '#38BDF8' : '#F43F5E'}; }
    p { font-size: 13px; color: #94A3B8; margin: 0 0 16px 0; line-height: 1.5; }
    button {
      background: #1E293B;
      color: #E2E8F0;
      border: 1px solid #334155;
      padding: 8px 18px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
    }
    button:hover { background: #334155; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '☁️' : '⚠️'}</div>
    <h2>${success ? 'Google Drive Connected!' : 'Connection Failed'}</h2>
    <p>${success ? 'Closing popup and returning to TeleNexus workspace...' : safeError.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    ${!success ? '<button onclick="window.close()">Close Window</button>' : ''}
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_DRIVE_AUTH_RESULT',
          success: ${success},
          error: ${JSON.stringify(success ? null : safeError)},
        }, '*');
        if (${success}) {
          setTimeout(function() { window.close(); }, 500);
        }
      } else {
        window.location.href = ${JSON.stringify(success ? '/?drive_connected=true' : `/?drive_error=${encodeURIComponent(safeError)}`)};
      }
    } catch (e) {
      window.location.href = ${JSON.stringify(success ? '/?drive_connected=true' : `/?drive_error=${encodeURIComponent(safeError)}`)};
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return renderResultHtml(false, error ? `Google OAuth access denied (${error})` : 'Missing authorization code');
  }

  try {
    const res = await fetch(`${BACKEND_API_BASE}/backups/drive/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      const errMsg = errData?.error?.message || 'Failed to exchange Google OAuth authorization code';
      return renderResultHtml(false, errMsg);
    }

    return renderResultHtml(true);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server communication error';
    return renderResultHtml(false, msg);
  }
}

