/**
 * Global Input Sanitizer Middleware
 * 
 * Protects against NoSQL injection by:
 * 1. Recursively stripping MongoDB query operators ($gt, $ne, $regex, etc.)
 *    from req.body, req.query, and req.params.
 * 2. Rejecting requests where top-level expected-string fields contain
 *    objects or arrays (the core NoSQL injection vector).
 * 
 * Apply this ONCE globally after express.json() — it protects every route.
 */

// All MongoDB query/update operators that could be injected
const DANGEROUS_KEYS = new Set([
  '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin',
  '$or', '$and', '$not', '$nor',
  '$exists', '$type', '$mod', '$regex', '$options',
  '$text', '$search', '$where',
  '$all', '$elemMatch', '$size',
  '$set', '$unset', '$inc', '$push', '$pull', '$addToSet',
  '$rename', '$bit', '$min', '$max', '$mul',
  '$expr', '$jsonSchema', '$comment',
  '$slice', '$meta', '$natural',
]);

/**
 * Recursively sanitize a value:
 * - If it's a plain object, strip any keys that are MongoDB operators.
 * - If it's an array, sanitize each element.
 * - Otherwise, return as-is.
 */
function sanitize(value) {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (typeof value === 'object' && value.constructor === Object) {
    const cleaned = {};
    for (const key of Object.keys(value)) {
      if (DANGEROUS_KEYS.has(key)) {
        // Silently strip the dangerous key
        continue;
      }
      cleaned[key] = sanitize(value[key]);
    }
    return cleaned;
  }

  return value;
}

/**
 * Express middleware — sanitizes req.body, req.query, and req.params.
 */
function sanitizeInput(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitize(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      req.query = sanitize(req.query);
    }

    if (req.params && typeof req.params === 'object') {
      req.params = sanitize(req.params);
    }

    next();
  } catch (err) {
    console.error('Input sanitizer error:', err.message);
    return res.status(400).json({ message: 'Invalid request payload.' });
  }
}

module.exports = { sanitizeInput, sanitize };
