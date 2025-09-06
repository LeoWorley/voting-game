function adminApiKeyGuard(req, res, next) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return res.status(500).json({ message: 'Server misconfiguration: ADMIN_API_KEY not set' });
  }
  const provided = req.headers['x-api-key'];
  if (!provided || provided !== expected) {
    return res.status(403).json({ message: 'Forbidden: invalid API key' });
  }
  return next();
}

module.exports = { adminApiKeyGuard };

