const INVALID_DATE_KEY = "invalid-date";
const LABEL_INVALID_DATE =
  "\u062a\u0627\u0631\u06cc\u062e \u0646\u0627\u0645\u0639\u062a\u0628\u0631";
const LABEL_TODAY = "\u0627\u0645\u0631\u0648\u0632";
const LABEL_YESTERDAY = "\u062f\u06cc\u0631\u0648\u0632";

const getMessageSentValue = (message) =>
  Object.values(message?.status?.sent || {})[0] ?? message?.createdDate ?? null;

const getMessageTimestamp = (message) => {
  const rawSentValue = getMessageSentValue(message);
  const parsed = rawSentValue ? new Date(rawSentValue).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const groupMessagesByDate = (messages) => {
  if (!messages || messages.length === 0) return [];

  const sortedMessages = [...messages].sort((a, b) => {
    const timeDiff = getMessageTimestamp(a) - getMessageTimestamp(b);
    if (timeDiff !== 0) return timeDiff;
    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  });

  const groupedMessagesByDate = sortedMessages.reduce((acc, message) => {
    const sentDate = getMessageSentValue(message);
    const dateKey =
      typeof sentDate === "string" ? sentDate.split("T")[0] : INVALID_DATE_KEY;

    const formattedDate =
      dateKey !== INVALID_DATE_KEY
        ? dateKey.split("-").reverse().join(".")
        : LABEL_INVALID_DATE;

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let groupLabel;
    if (dateKey === today) {
      groupLabel = LABEL_TODAY;
    } else if (dateKey === yesterday) {
      groupLabel = LABEL_YESTERDAY;
    } else {
      groupLabel = formattedDate;
    }

    if (!acc[dateKey]) {
      acc[dateKey] = { label: groupLabel, messages: [] };
    }

    acc[dateKey].messages.push({ id: message.id, ...message });
    return acc;
  }, {});

  return Object.entries(groupedMessagesByDate)
    .sort(([dateKeyA], [dateKeyB]) => {
      if (dateKeyA === INVALID_DATE_KEY) return 1;
      if (dateKeyB === INVALID_DATE_KEY) return -1;
      return new Date(dateKeyA).getTime() - new Date(dateKeyB).getTime();
    })
    .map(([, group]) => [group.label, group.messages])
    .filter(([_, grouped]) => grouped.length > 0);
};
