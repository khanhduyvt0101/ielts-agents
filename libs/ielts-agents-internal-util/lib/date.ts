import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import relativeTime from "dayjs/plugin/relativeTime.js";

dayjs.extend(duration);
dayjs.extend(relativeTime);

export function getPreviousMonthDate(date?: dayjs.ConfigType): Date {
  return dayjs(date).subtract(1, "month").toDate();
}

export function getNextMonthDate(date?: dayjs.ConfigType): Date {
  return dayjs(date).add(1, "month").toDate();
}

export function formatRelativeTime(date: dayjs.ConfigType): string {
  return dayjs(date).fromNow();
}

export function formatDuration(duration = 0) {
  return dayjs.duration(duration).humanize();
}

export function formatDate(date: dayjs.ConfigType): string {
  return dayjs(date).format("MMM D, YYYY");
}

export function formatTime(date: dayjs.ConfigType): string {
  return dayjs(date).format("h:mm A");
}

export function formatShortDateTime(date: dayjs.ConfigType): string {
  return dayjs(date).format("MMM D, h:mm A");
}

export function formatLongDateTime(date: dayjs.ConfigType): string {
  return dayjs(date).format("[on] MMM D, YYYY [at] h:mm A");
}
