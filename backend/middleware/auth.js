// Lightweight Clerk-style auth middleware.
// In production, replace with @clerk/express or verified JWT checks.

function decodeBase64Url(str) {
  // Convert base64url to base64
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '='
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

function parseJwtWithoutVerify(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    return payload;
  } catch (_) {
    return null;
  }
}

function extractUserIdFromPayload(payload) {
  // Prefer standard JWT subject claim used by Clerk
  if (payload?.sub) return payload.sub;
  // Fallbacks in case different claim names are used
  if (payload?.user_id) return payload.user_id;
  if (payload?.uid) return payload.uid;
  if (payload?.id) return payload.id;
  return null;
}

function authMiddleware(req, res, next) {
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

  // NOTE: We are not verifying the signature here due to environment constraints.
  // In production, verify against Clerk JWKS or use @clerk/express middleware.
  const payload = parseJwtWithoutVerify(token);
  const userId = extractUserIdFromPayload(payload || {});

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: invalid token' });
  }

  req.auth = { userId };
  return next();
}

module.exports = { authMiddleware };

