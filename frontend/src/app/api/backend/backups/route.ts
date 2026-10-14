import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy-handler';

async function handleProxy(req: NextRequest) {
  return proxyToBackend(req, { subsystem: 'backups' });
}

export const GET = handleProxy;
export const POST = handleProxy;
