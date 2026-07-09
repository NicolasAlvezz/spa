/**
 * Extracts a valid IP address from proxy headers. Returns null if the header is
 * missing, empty, or malformed — storing an invalid value into a Postgres `inet`
 * column makes the whole INSERT/UPDATE fail with a 500 (common on US mobile
 * networks where x-forwarded-for is sometimes empty or malformed).
 */
export function parseClientIp(req: Request): string | null {
  const candidate =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    ''

  if (!candidate) return null

  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6 = /^[0-9a-fA-F:]+$/
  if (ipv4.test(candidate) || (candidate.includes(':') && ipv6.test(candidate))) {
    return candidate
  }
  return null
}
