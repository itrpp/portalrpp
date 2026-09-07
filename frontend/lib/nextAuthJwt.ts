import type { JWT, JWTDecodeParams, JWTEncodeParams } from 'next-auth/jwt';

import { decode as defaultDecode, encode as defaultEncode } from 'next-auth/jwt';

/** Hex-only cookie values cannot contain `--`, which WAF flags as SQL line comments. */
const HEX_TOKEN_RE = /^[0-9a-f]+$/i;

function unwrapSessionToken(token: string): string {
  if (HEX_TOKEN_RE.test(token) && token.length % 2 === 0) {
    try {
      return Buffer.from(token, 'hex').toString('utf8');
    } catch {
      // Fall through to treat as legacy JWT
    }
  }

  return token;
}

/**
 * Encode NextAuth session JWT as hex so cookie values stay WAF-safe
 * (no `--` / SQL "Line Comments" false positives).
 */
export async function encodeSessionToken(params: JWTEncodeParams): Promise<string> {
  const jwt = await defaultEncode(params);

  return Buffer.from(jwt, 'utf8').toString('hex');
}

/**
 * Decode hex-wrapped session tokens; also accepts legacy raw JWTs until re-login.
 */
export async function decodeSessionToken(params: JWTDecodeParams): Promise<JWT | null> {
  if (!params.token) {
    return null;
  }

  return defaultDecode({
    ...params,
    token: unwrapSessionToken(params.token),
  });
}
