import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy-handler';

async function handleProxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyToBackend(req, { subsystem: 'telegram', subPath: path.join('/') });
}

export const GET = handleProxy;
export const POST = handleProxy;
