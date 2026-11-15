// Standard gravity, not a measured local terrestrial acceleration.
// NIST SP 811 Appendix B.9: 1 g_n = 9.80665 m/s² exactly.
export const STANDARD_GRAVITY_MS2 = 9.80665;
export const GRAVITY_INPUT_ERROR = 'Enter gravity from 0 to 1000 m/s²: for example 1.96 (m/s²) or 1.96 g (Earth-gravity multiples).';

export function parseGravityInput(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const match = /^([+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?)\s*(g|m\s*\/\s*s(?:²|\^?2))?$/i.exec(String(value).trim());
  if (!match) return NaN;
  const magnitude = Number(match[1].replace(',', '.'));
  const ms2 = match[2]?.toLowerCase() === 'g' ? magnitude * STANDARD_GRAVITY_MS2 : magnitude;
  return Number.isFinite(ms2) && ms2 >= 0 && ms2 <= 1000 ? ms2 : NaN;
}

export function readConditionInput(key, value) {
  return key === 'gravityMs2' ? parseGravityInput(value) : value === '' ? null : Number(value);
}

export function gravityInputMessage(value) {
  const ms2 = parseGravityInput(value);
  if (Number.isNaN(ms2)) return GRAVITY_INPUT_ERROR;
  if (ms2 === null) return 'Bare numbers use m/s². Add g or G for Earth-gravity multiples. 1 g = 9.80665 m/s².';
  const formatted = new Intl.NumberFormat('en-US', {maximumSignificantDigits: 10}).format(ms2);
  return `Used in comparisons: ${formatted} m/s². 1 g = 9.80665 m/s².`;
}
