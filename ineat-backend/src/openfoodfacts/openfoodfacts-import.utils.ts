export function escapeCopyValue(value: string | number | null): string {
  if (value === null) return '\\N';
  return String(value)
    .replace(/\0/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
