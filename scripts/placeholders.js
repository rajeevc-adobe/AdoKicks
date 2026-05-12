const placeholdersCache = new Map();

export function toCamelCase(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function readCell(row, names) {
  const key = names.find((name) => Object.prototype.hasOwnProperty.call(row, name));
  return key ? row[key] : '';
}

async function loadPlaceholders(prefix) {
  try {
    const resp = await fetch(`${prefix}/placeholders.json`);
    if (!resp.ok) return {};

    const json = await resp.json();
    const rows = Array.isArray(json.data) ? json.data : [];
    return rows.reduce((placeholders, row) => {
      const key = toCamelCase(readCell(row, ['Key', 'key']));
      const text = readCell(row, ['Text', 'text']);
      if (key && text !== undefined && text !== null) {
        placeholders[key] = String(text);
      }
      return placeholders;
    }, {});
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[placeholders] using fallback copy', error);
    return {};
  }
}

export async function fetchPlaceholders(prefix = '') {
  const cleanPrefix = String(prefix || '').replace(/\/$/, '');
  const cacheKey = cleanPrefix || '/';
  if (!placeholdersCache.has(cacheKey)) {
    placeholdersCache.set(cacheKey, loadPlaceholders(cleanPrefix));
  }
  return placeholdersCache.get(cacheKey);
}
