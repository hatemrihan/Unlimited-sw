import { NextRequest, NextResponse } from 'next/server';
import dbConnect from './mongodb';
import { toStatusCode } from './errors';

type RouteContext = { params: Record<string, string> | Promise<Record<string, string>> };
type RouteHandler =
  (req: NextRequest, ctx?: any) => Promise<NextResponse>;

/**
 * withDb — middleware wrapper that ensures the MongoDB connection is ready
 * before the handler runs. Every API route uses this instead of calling
 * `await dbConnect()` inline.
 *
 * Usage:
 *   export const GET = withDb(async (req) => { ... });
 */
export function withDb(
  handler: RouteHandler
): RouteHandler {
  return async (req: NextRequest, ctx?: any): Promise<NextResponse> => {
    try {
      await dbConnect();
    } catch (err) {
      console.error('withDb: MongoDB connection failed', err);
      return NextResponse.json(
        { success: false, error: 'Database unavailable' },
        { status: 503 }
      );
    }

    try {
      return await handler(req, ctx);
    } catch (err: unknown) {
      const status = toStatusCode(err);
      const userMessage = (err as any).userMessage ?? 'Something went wrong. Please try again.';
      const devMessage = err instanceof Error ? err.message : 'Internal server error';
      
      console.error(`withDb: handler threw [${status}]`, devMessage);
      return NextResponse.json({ success: false, error: userMessage }, { status });
    }
  };
}
