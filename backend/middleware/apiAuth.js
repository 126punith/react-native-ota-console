/**
 * Simple API key authentication for React Native apps
 * In production, you might want to use a more sophisticated approach
 */

const apiAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  // For now, we'll allow requests without API key in development
  // In production, you should validate against a database of app credentials
  if (process.env.NODE_ENV === 'production') {
    const validApiKey = process.env.API_KEY_SECRET;
    
    if (!apiKey || apiKey !== validApiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
  }

  // Store app ID from header if provided
  req.appId = req.headers['x-app-id'] || req.query.appId;
  
  if (!req.appId) {
    return res.status(400).json({ error: 'App ID is required' });
  }

  next();
};

module.exports = apiAuth;

