import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy-handler';

export async function GET(req: NextRequest) {
  return proxyToBackend(req, { subsystem: 'health' });
}
