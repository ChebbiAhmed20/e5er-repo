/**
 * Sanitize Excel cell values to prevent formula injection.
 * Cells starting with =, +, -, @ must be escaped (prefix with single quote or strip).
 * Used for both import validation and export output.
 */

const DANGEROUS_PREFIXES = ['=', '+', '-', '@'];

/**
 * Returns true if the value looks like a formula or could be interpreted as one.
 * @param {*} value - Cell value (string or number)
 */
function isPotentiallyDangerous(value) {
    if (value == null) return false;
    const s = String(value).trim();
    if (!s) return false;
    return DANGEROUS_PREFIXES.some((p) => s.startsWith(p));
}

/**
 * Escape a value for safe display in Excel (export) or for safe storage.
 * Prefix with single quote so Excel treats it as text.
 * @param {*} value
 * @returns {string}
 */
function escapeForExcel(value) {
    if (value == null || value === '') return '';
    const s = String(value).trim();
    if (!s) return '';
    if (DANGEROUS_PREFIXES.some((p) => s.startsWith(p))) {
        return "'" + s;
    }
    return s;
}

/**
 * Sanitize a string for import: if it looks like a formula, strip or escape it.
 * We escape by prefixing with single quote so stored value is safe and display-safe.
 * @param {*} value
 * @returns {string}
 */
function sanitizeForImport(value) {
    if (value == null || value === '') return '';
    const s = String(value).trim();
    if (!s) return '';
    if (DANGEROUS_PREFIXES.some((p) => s.startsWith(p))) {
        return "'" + s;
    }
    return s;
}

/**
 * Apply sanitization to all string values in an object (for a row).
 * @param {Record<string, unknown>} row - One row of key-value pairs
 * @param {string[]} stringKeys - Keys that should be treated as strings and sanitized
 */
function sanitizeRowForImport(row, stringKeys) {
    const out = { ...row };
    for (const key of stringKeys) {
        if (out[key] != null && typeof out[key] === 'string') {
            out[key] = sanitizeForImport(out[key]);
        }
    }
    return out;
}

module.exports = {
    isPotentiallyDangerous,
    escapeForExcel,
    sanitizeForImport,
    sanitizeRowForImport,
};
