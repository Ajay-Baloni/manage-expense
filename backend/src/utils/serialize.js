/**
 * Shared serialization helpers for converting Prisma values into the exact
 * JSON shapes the React frontend expects (snake_case keys, dates as
 * "YYYY-MM-DD", datetimes as ISO strings, Decimals as Numbers).
 */

export function toNumber(value) {
  if (value === null || value === undefined) return value;
  // Prisma Decimal has a toNumber()/toString(); plain numbers/strings handled too.
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value);
}

export function toDateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  // Use UTC components so a @db.Date (stored at midnight UTC) renders correctly.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toIso(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function fullName(firstName, lastName, email) {
  const name = `${firstName || ''} ${lastName || ''}`.trim();
  return name || email;
}

export function serializeCategory(cat) {
  if (!cat) return null;
  return {
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    type: cat.type,
    is_default: cat.isDefault,
    created_at: toIso(cat.createdAt),
  };
}

export function serializeTag(tag) {
  if (!tag) return null;
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
  };
}

export function serializeProfile(profile) {
  return {
    avatar_url: profile?.avatarUrl ?? '',
    currency: profile?.currency ?? 'USD',
    timezone: profile?.timezone ?? 'UTC',
    theme: profile?.theme ?? 'system',
  };
}

export function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    full_name: fullName(user.firstName, user.lastName, user.email),
    profile: serializeProfile(user.profile),
    date_joined: toIso(user.dateJoined),
  };
}
