// @ts-nocheck
import { startOfDay } from 'date-fns';

export function groupMessagesByDate(messages) {
  return messages.reduce((acc, msg) => {
    const date = startOfDay(new Date(msg.timestamp));
    const key = date.toISOString().split('T')[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg);
    return acc;
  }, {});
}
