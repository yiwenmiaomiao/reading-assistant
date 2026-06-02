const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

function pad(value) {
  return `${value}`.padStart(2, '0');
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const dayStart = startOfDay(date);
  const day = dayStart.getDay() || 7;
  dayStart.setDate(dayStart.getDate() - day + 1);
  return dayStart;
}

function getReadingScore(note) {
  const excerptScore = `${note.content || ''}`.trim() ? 1 : 0;
  const reflection = `${note.reflection || ''}`.trim();
  return excerptScore + (reflection.length > 20 ? 1.5 : 0);
}

function formatScore(score) {
  const value = Math.round(score * 10) / 10;
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function buildMonth(notes, year, month) {
  const today = new Date();
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const notesByDate = notes.reduce((map, note) => {
    const ymd = note.checkinDate || formatDate(new Date(note.createdAt));
    map[ymd] = (map[ymd] || 0) + 1;
    return map;
  }, {});
  const cells = [];

  for (let index = 0; index < leadingBlanks; index += 1) {
    cells.push({ key: `blank_start_${index}`, isBlank: true, className: 'calendar-day blank' });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    const ymd = formatDate(date);
    const checked = !!notesByDate[ymd];
    const isToday = formatDate(date) === formatDate(today);
    const isFuture = startOfDay(date).getTime() > startOfDay(today).getTime();
    const classNames = ['calendar-day', checked ? 'checked' : 'unchecked'];
    if (isToday) classNames.push('today');
    if (isFuture) classNames.push('future');

    cells.push({
      key: `day_${ymd}`,
      ymd,
      day,
      checked,
      count: notesByDate[ymd] || 0,
      isToday,
      isFuture,
      isBlank: false,
      className: classNames.join(' '),
      countText: checked ? `${notesByDate[ymd]} 条` : ''
    });
  }

  const trailingBlanks = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailingBlanks; index += 1) {
    cells.push({ key: `blank_end_${index}`, isBlank: true, className: 'calendar-day blank' });
  }

  const days = notes.reduce((map, note) => {
    map[note.checkinDate || formatDate(new Date(note.createdAt))] = true;
    return map;
  }, {});
  let streakDays = 0;
  const cursor = new Date();
  while (days[formatDate(cursor)]) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    year,
    month,
    monthLabel: `${year}年${month < 10 ? `0${month}` : month}月`,
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    cells,
    streakDays,
    isCheckedToday: !!days[formatDate(today)]
  };
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const today = new Date();
  const year = Number(event.year) || today.getFullYear();
  const month = Number(event.month) || today.getMonth() + 1;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const monthNotes = await db.collection('notes').where({
    _openid: OPENID,
    isDeleted: _.neq(true),
    createdAt: _.gte(monthStart).and(_.lte(monthEnd))
  }).limit(1000).get();

  const allNotes = await db.collection('notes').where({
    _openid: OPENID,
    isDeleted: _.neq(true)
  }).limit(1000).get();

  return {
    month: buildMonth(allNotes.data, year, month),
    notes: monthNotes.data,
    weekStart: startOfWeek(today),
    weekReadingScore: formatScore(allNotes.data
      .filter((note) => new Date(note.createdAt).getTime() >= startOfWeek(today).getTime())
      .reduce((total, note) => total + getReadingScore(note), 0))
  };
};
