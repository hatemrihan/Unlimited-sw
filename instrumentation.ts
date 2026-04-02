export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { warmCache } = await import('./lib/cache-warmer');
    warmCache().catch(console.error);
  }
}
