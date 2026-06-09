/**
 * Custom API error with a status code and a payload shaped like the
 * frontend / DRF expects (usually { detail: "..." }).
 */
export class ApiError extends Error {
  constructor(status, payload) {
    super(typeof payload === 'string' ? payload : payload?.detail || 'Error');
    this.status = status;
    this.payload =
      typeof payload === 'string' ? { detail: payload } : payload;
  }
}

export const notFound = (detail = 'Not found.') => new ApiError(404, { detail });
export const badRequest = (payload) => new ApiError(400, payload);
export const forbidden = (detail) => new ApiError(403, { detail });
export const unauthorized = (detail = 'Authentication credentials were not provided.') =>
  new ApiError(401, { detail });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json(err.payload);
  }

  // Prisma known errors
  if (err && err.code === 'P2002') {
    return res.status(400).json({ detail: 'A record with these values already exists.' });
  }
  if (err && err.code === 'P2025') {
    return res.status(404).json({ detail: 'Not found.' });
  }

  // Multer / body parse / JSON errors
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ detail: 'Invalid JSON body.' });
  }

  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ detail: 'Internal server error.' });
}
