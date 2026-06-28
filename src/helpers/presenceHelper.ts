// @ts-nocheck
const ONLINE_LAST_CONNECTION_PREFIX = "0001-01-01T00:00:00";

export const hasLegacyOnlineMarker = (lastConnectionDate) => {
  if (lastConnectionDate == null) {
    return false;
  }

  if (lastConnectionDate instanceof Date) {
    return lastConnectionDate.getUTCFullYear() === 1;
  }

  if (typeof lastConnectionDate !== "string") {
    return false;
  }

  return lastConnectionDate.startsWith(ONLINE_LAST_CONNECTION_PREFIX);
};

export const isUserOnline = (lastConnectionDate, explicitOnline) => {
  if (typeof explicitOnline === "boolean") {
    return explicitOnline;
  }

  return hasLegacyOnlineMarker(lastConnectionDate);
};
