/**
 * Generates a clean, URL-friendly slug from a text string.
 * Normalize accents/diacritics, convert to lowercase, remove non-alphanumeric, and replace spaces with dashes.
 * 
 * @param {string} text - The input text to slugify
 * @returns {string} The generated slug
 */
export function generateSlug(text) {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')      // keep alphanumeric, spaces, and hyphens
    .replace(/\s+/g, '-')              // spaces to hyphens
    .replace(/-+/g, '-');              // collapse multiple hyphens
}
