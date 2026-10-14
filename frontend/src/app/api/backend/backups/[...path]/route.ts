import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy-handler';

async function handleProxy(
  req: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  let subPath: string | undefined;
  try {
    const resolved = await props.params;
    if (resolved?.path && Array.isArray(resolved.path)) {
      subPath = resolved.path.join('/');
    }
  } catch {
    // URL-based extraction fallback in proxyToBackend
  }
  return proxyToBackend(req, { subsystem: 'backups', subPath });
}

export const GET = handleProxy;
export const POST = handleProxy;
export const DELETE = handleProxy;


