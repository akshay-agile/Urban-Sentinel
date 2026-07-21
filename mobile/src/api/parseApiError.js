/**
 * FastAPI's error `detail` field isn't consistently a string — plain
 * HTTPExceptions (404, 409, 401, etc.) send a string, but 422 validation
 * errors send an ARRAY of {type, loc, msg, input, ctx} objects. Passing
 * that array straight into <Text> crashes React Native ("Objects are not
 * valid as a React child"). This normalizes either shape into one string.
 */
export function parseApiError(err, fallback) {
  const detail = err?.response?.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).filter(Boolean).join(' ') || fallback;
  }

  return fallback;
}
