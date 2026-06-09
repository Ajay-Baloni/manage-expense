export const PAGE_SIZE = 20;

/**
 * Build a DRF-style paginated response:
 * { count, next, previous, results }
 *
 * `req` is used to construct absolute next/previous URLs based on the original
 * request path & query string (page-number based).
 */
export function paginate({ req, count, page, results, pageSize = PAGE_SIZE }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = page;

  const next = currentPage < totalPages ? buildPageUrl(req, currentPage + 1) : null;
  const previous = currentPage > 1 ? buildPageUrl(req, currentPage - 1) : null;

  return { count, next, previous, results };
}

function buildPageUrl(req, page) {
  const protocol = req.protocol || 'http';
  const host = req.get ? req.get('host') : 'localhost';
  const base = `${protocol}://${host}`;
  const url = new URL(req.originalUrl, base);
  url.searchParams.set('page', String(page));
  return url.toString();
}

/**
 * Parse a 1-indexed page number from query string (defaults to 1).
 */
export function getPage(req) {
  const raw = parseInt(req.query.page, 10);
  if (Number.isNaN(raw) || raw < 1) return 1;
  return raw;
}

export function getSkipTake(page, pageSize = PAGE_SIZE) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
