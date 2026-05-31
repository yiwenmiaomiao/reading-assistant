function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function formatDate(value) {
  const date = toDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(value) {
  const date = toDate(value);
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfDay(value) {
  const date = toDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(value) {
  const date = startOfDay(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function addDays(value, days) {
  const date = toDate(value);
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a, b) {
  return formatDate(a) === formatDate(b);
}

module.exports = {
  addDays,
  formatDate,
  formatDateTime,
  isSameDay,
  startOfDay,
  startOfWeek
};
