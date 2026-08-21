import { NextRequest, NextResponse } from 'next/server';
import { noStoreJson } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const response = noStoreJson({ success: true });
  response.cookies.set('ppsu_auth_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });
  return response;
}
