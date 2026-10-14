import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy-handler';

async function handleProxy(
  req: NextRequest,
  context?: { params?: Promise<{ path?: string[] | string }> | { path?: string[] | string } }
) {
  return proxyToBackend(req, { subsystem: 'profiles', context });
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;

