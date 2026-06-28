// @ts-nocheck
export const convertToLocalTime = (timestamp) => {
  const date = new Date(timestamp);
  date.setHours(date.getHours());
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};