export function localDateISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}
export function formatDateBR(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
