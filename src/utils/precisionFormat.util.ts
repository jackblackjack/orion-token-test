export const precisionFormat = (value: string | number, scale = 18): string => {
  value = String(value);
  if (value.length <= scale) {
    value = '0'.repeat(scale - value.length + 1).concat(value);
  }
  return value.slice(0, value.length - scale).concat('.', value.slice(value.length - scale));
}
