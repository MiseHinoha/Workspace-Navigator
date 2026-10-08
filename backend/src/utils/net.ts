import dns from 'dns/promises';
import net from 'net';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * SSRF-safe outbound HTTP.
 *
 * The app fetches remote URLs on behalf of users in two places: bookmark
 * metadata (title / description / icon <link>) and the icon proxy that feeds
 * <img src="/api/bookmarks/icon?url=...">. Both used to follow redirects
 * blindly, so a request to a public host could be bounced to 127.0.0.1 or to a
 * cloud metadata endpoint (169.254.169.254) and read from the server's network.
 *
 * Rules enforced here:
 *   - only http/https;
 *   - the hostname must not be a loopback/private/link-local literal;
 *   - every hostname is resolved first and refused when any record is private;
 *   - redirects are followed manually (max 5 hops) and re-validated per hop;
 *   - a response size cap keeps a hostile URL from exhausting memory.
 *
 * Known residual risk: DNS is resolved here and again by the socket layer, so a
 * rebinding attacker that changes the record in between could still slip past.
 * Closing that requires pinning the resolved IP and overriding the TLS SNI,
 * which is more machinery than this app needs today.
 */

const PRIVATE_V4_PATTERNS = [
  /^0\./,
  /^10\./,
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./, // CGNAT 100.64.0.0/10
  /^127\./,
  /^169\.254\./, // link-local
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.0\.0\./,
  /^192\.168\./,
  /^198\.(1[89])\./, // benchmarking
  /^22[4-9]\./,
  /^2[3-5]\d\./, // multicast + reserved
];

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa'];

export function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    return PRIVATE_V4_PATTERNS.some((pattern) => pattern.test(address));
  }

  const value = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (value === '::1' || value === '::') return true;
  if (value.startsWith('fe80')) return true; // link-local
  if (value.startsWith('fc') || value.startsWith('fd')) return true; // unique local

  const mapped = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateAddress(mapped[1]);

  return false;
}

export function isBlockedHostname(rawUrl: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(rawUrl).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  } catch {
    return true;
  }

  if (!hostname) return true;
  if (hostname === 'localhost') return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return true;
  if (net.isIP(hostname)) return isPrivateAddress(hostname);

  return false;
}

export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`blocked protocol: ${url.protocol}`);
  }

  if (isBlockedHostname(url.toString())) {
    throw new Error(`blocked host: ${url.hostname}`);
  }

  // Literal IPs are already covered above; only names need a DNS check.
  if (!net.isIP(url.hostname.replace(/^\[|\]$/g, ''))) {
    const records = await dns.lookup(url.hostname, { all: true, verbatim: true });
    if (!records.length) {
      throw new Error(`dns: no records for ${url.hostname}`);
    }
    if (records.some((record) => isPrivateAddress(record.address))) {
      throw new Error(`blocked host resolving to a private address: ${url.hostname}`);
    }
  }

  return url;
}

export interface SafeGetOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
  responseType?: AxiosRequestConfig['responseType'];
  maxRedirects?: number;
}

export interface SafeGetResult {
  response: AxiosResponse;
  finalUrl: string;
  redirects: number;
}

export async function safeGet(rawUrl: string, options: SafeGetOptions = {}): Promise<SafeGetResult> {
  const maxRedirects = options.maxRedirects ?? 5;
  let currentUrl = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const validated = await assertPublicHttpUrl(currentUrl);

    const response = await axios.get(validated.toString(), {
      timeout: options.timeoutMs ?? 10000,
      maxRedirects: 0, // handled here so every hop gets re-validated
      responseType: options.responseType,
      maxContentLength: options.maxBytes ?? 5 * 1024 * 1024,
      maxBodyLength: options.maxBytes ?? 5 * 1024 * 1024,
      headers: options.headers,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location) {
        throw new Error(`redirect without location from ${validated.toString()}`);
      }
      currentUrl = new URL(String(location), validated).toString();
      continue;
    }

    return { response, finalUrl: validated.toString(), redirects: hop };
  }

  throw new Error(`too many redirects (${maxRedirects}) for ${rawUrl}`);
}
