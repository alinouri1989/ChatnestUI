export const formatDateToTR = (dateString) => {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
};

export const lastMessageDateHelper = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);

  if (now.toDateString() === date.toDateString()) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return "دیروز";
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export const formatDateForLastConnectionDate = (dateString) => {
  if (dateString === null) {
    return "آنلاین";
  }
  const now = new Date();
  const date = new Date(dateString);

  if (now.toDateString() === date.toDateString()) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `امروز ${hours}:${minutes}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (yesterday.toDateString() === date.toDateString()) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `دیروز ${hours}:${minutes}`;
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

export function formatTimeHoursMinutes(isoString) {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatCallDuration(callDuration) {
  const [hours, minutes, seconds] = callDuration.split(':');

  const hoursInt = parseInt(hours);
  const minutesInt = parseInt(minutes);
  const secondsInt = Math.floor(parseFloat(seconds));

  let formattedDuration = '';

  if (hoursInt > 0) {
    formattedDuration += `${hoursInt} saat `;
  }

  if (minutesInt > 0) {
    formattedDuration += `${minutesInt} dakika `;
  }

  if (secondsInt > 0 || formattedDuration === '') {
    formattedDuration += `${secondsInt} saniye`;
  }

  return formattedDuration.trim();
}

export const formatDateForMessageInfo = (dateString) => {
  const date = new Date(dateString);
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};
