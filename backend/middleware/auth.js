// Clerk-compatible JWT verification middleware built on jose.
const { createRemoteJWKSet, jwtVerify } = require('jose');

function extractUserIdFromPayload(payload) {
  // Prefer standard JWT subject claim used by Clerk
  if (payload?.sub) return payload.sub;
  // Fallbacks in case different claim names are used
  if (payload?.user_id) return payload.user_id;
  if (payload?.uid) return payload.uid;
  if (payload?.id) return payload.id;
  return null;
}

const jwksUrl = process.env.CLERK_JWKS_URL || '';
const issuer = process.env.CLERK_ISSUER || '';
const audience = process.env.CLERK_AUDIENCE || '';

let jwksFetcher = null;
if (jwksUrl) {
  try {
    jwksFetcher = createRemoteJWKSet(new URL(jwksUrl));
  } catch (error) {
    console.error('Invalid CLERK_JWKS_URL provided:', error);
  }
}

async function verifyClerkToken(token) {
  if (!jwksFetcher) {
    throw new Error('Clerk JWKS not configured');
  }

  const verifyOptions = {};
  if (issuer) verifyOptions.issuer = issuer;
  if (audience) verifyOptions.audience = audience;

  const result = await jwtVerify(token, jwksFetcher, verifyOptions);
  return result.payload;
}

async function authMiddleware(req, res, next) {
  const devFallbackEnabled = process.env.ENABLE_DEV_AUTH_FALLBACK === 'true' || process.env.NODE_ENV !== 'production';

  // Dev fallback: allow passing user ID directly via header for local dev/testing
  if (devFallbackEnabled && req.headers['x-dev-user-id']) {
    req.auth = { userId: String(req.headers['x-dev-user-id']) };
    return next();
  }

  const authHeader = req.headers['authorization'] || '';
  const [scheme, token] = authHeader.split(' ');

  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({ message: 'Unauthorized: missing Bearer token' });
  }

  try {
    const payload = await verifyClerkToken(token);
    const userId = extractUserIdFromPayload(payload || {});

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: token missing user id' });
    }

    req.auth = { userId };
    return next();
  } catch (error) {
    if (error.message === 'Clerk JWKS not configured') {
      return res.status(500).json({ message: 'Server misconfiguration: Clerk JWKS not configured' });
    }
    return res.status(401).json({ message: 'Unauthorized: invalid token' });
  }
}

module.exports = { authMiddleware };
