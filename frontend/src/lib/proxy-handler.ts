import { NextRequest, NextResponse } from 'next/server';

/**
 * Universal Upstream Backend API Base URL.
 * Configured via process.env.BACKEND_API_URL with local fallback.
 */
export const BACKEND_API_BASE =
  process.env.BACKEND_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:4000/api/v1';

export interface ProxyOptions {
  subsystem: string;
  subPath?: string;
}

/**
 * Reusable proxy handler for routing Next.js requests to the upstream Node.js backend.
 * Enforces:
 * - Reverse Proxy Enclosure (Zero browser direct-connects to port 4000)
 * - Automatic x-dashboard-token forwarding for Master Passcode verification
 * - Dynamic binary download detection (Excel / encrypted backups)
 * - Universal Error Envelope formatting on communication failure
 */
export async function proxyToBackend(
  req: NextRequest,
  options: ProxyOptions
): Promise<NextResponse> {
  try {
    const { subsystem, subPath } = options;
    const url = new URL(req.url);
    const queryString = url.search;
    const pathPart = subPath ? `/${subPath}` : '';
    const targetUrl = `${BACKEND_API_BASE}/${subsystem}${pathPart}${queryString}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = req.headers.get('x-dashboard-token');
    if (token) headers['x-dashboard-token'] = token;

    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await req.text();
    }

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    });

    const contentType = backendRes.headers.get('content-type') || '';
    const disposition = backendRes.headers.get('content-disposition') || '';

    const isBinaryDownload =
      disposition.includes('attachment') ||
      contentType.includes('application/octet-stream') ||
      contentType.includes('application/vnd.openxmlformats') ||
      contentType.includes('spreadsheetml') ||
      contentType.includes('excel') ||
      contentType.includes('zip') ||
      (!contentType.includes('application/json') && backendRes.ok);

    if (isBinaryDownload) {
      const buffer = await backendRes.arrayBuffer();
      return new NextResponse(buffer, {
        status: backendRes.status,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Content-Disposition': disposition || 'attachment',
        },
      });
    }

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROXY_ERROR',
          message: `Unable to communicate with upstream ${options.subsystem} service on port 4000`,
        },
      },
      { status: 503 }
    );
  }
}
