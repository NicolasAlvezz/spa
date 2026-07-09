/**
 * All serverless API routes run in US East (Washington DC, iad1).
 * Supabase lives in us-east-1 (N. Virginia) — same US coast, closest to
 * Kissimmee, FL clients. Do not add non-US regions here.
 */
export const VERCEL_FUNCTION_REGION = 'iad1' as const
