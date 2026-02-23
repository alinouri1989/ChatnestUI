const ONLINE_LAST_CONNECTION_PREFIX = "0001-01-01T00:00:00";

export const isUserOnline = (lastConnectionDate) => {
  if (lastConnectionDate == null) {
    return true;
  }

  if (lastConnectionDate instanceof Date) {
    return lastConnectionDate.getUTCFullYear() === 1;
  }

  if (typeof lastConnectionDate !== "string") {
    return false;
  }

  return lastConnectionDate.startsWith(ONLINE_LAST_CONNECTION_PREFIX);
};
