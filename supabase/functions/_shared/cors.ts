/**
 * CORS Configuration for Supabase Edge Functions
 *
 * SECURITY FIX (2026-01-08): Implements origin whitelist instead of wildcard "*"
 * to prevent unauthorized cross-origin requests from malicious websites.
 *
 * Usage:
 *   import { getCorsHeaders } from '../_shared/cors.ts';
 *
 *   serve(async (req) => {
 *     const corsHeaders = getCorsHeaders(req.headers.get('origin'));
 *
 *     if (req.method === 'OPTIONS') {
 *       return new Response('ok', { headers: corsHeaders });
 *     }
 *
 *     // ... your function logic
 *
 *     return new Response(JSON.stringify(data), {
 *       headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 *     });
 *   });
 */

/**
 * Allowed origins for CORS requests
 * Add your production domain and any other authorized origins here
 */
const ALLOWED_ORIGINS = [
  'http://localhost:8080',      // Local development (Vite default)
  'http://localhost:5173',      // Local development (Vite alternative port)
  'http://127.0.0.1:8080',      // Local development (127.0.0.1)
  'http://127.0.0.1:5173',      // Local development (127.0.0.1 alternative)
  // TODO: Add your production domain here
  // 'https://your-production-domain.com',
  // 'https://app.your-production-domain.com',
];

/**
 * Get CORS headers for a given origin
 *
 * @param requestOrigin - The Origin header from the request
 * @returns CORS headers object with appropriate Access-Control-Allow-Origin
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Check if the origin is in the allowed list
  const isAllowedOrigin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin);

  // Use the requesting origin if it's allowed, otherwise use the first allowed origin as default
  const allowedOrigin = isAllowedOrigin ? requestOrigin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400', // 24 hours - cache preflight response
  };
}

/**
 * Get CORS headers from environment variable (alternative approach)
 *
 * This allows configuring origins via Supabase Edge Function secrets
 * Usage: Set ALLOWED_ORIGINS secret to comma-separated list of origins
 *
 * @param requestOrigin - The Origin header from the request
 * @returns CORS headers object
 */
export function getCorsHeadersFromEnv(requestOrigin: string | null): Record<string, string> {
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((origin) => origin.trim())
    : ALLOWED_ORIGINS;

  const isAllowedOrigin = requestOrigin && allowedOrigins.includes(requestOrigin);
  const allowedOrigin = isAllowedOrigin ? requestOrigin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handle CORS preflight OPTIONS request
 *
 * @param requestOrigin - The Origin header from the request
 * @returns Response object for OPTIONS request
 */
export function handleCorsPreflightRequest(requestOrigin: string | null): Response {
  return new Response('ok', {
    status: 200,
    headers: getCorsHeaders(requestOrigin),
  });
}
