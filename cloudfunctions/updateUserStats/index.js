const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

function formatDate(date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
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

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const notes = await db.collection('notes').where({
    _openid: openid,
    isDeleted: _.neq(true)
  }).limit(1000).get();

  const books = {};
  const days = {};
  const weekStart = startOfWeek(new Date()).getTime();
  let totalReadingScore = 0;
  let weekReadingScore = 0;

  notes.data.forEach((note) => {
    if (note.bookTitle) books[note.bookTitle] = true;
    days[formatDate(new Date(note.createdAt))] = true;
    const score = getReadingScore(note);
    totalReadingScore += score;
    if (new Date(note.createdAt).getTime() >= weekStart) {
      weekReadingScore += score;
    }
  });

  let streakDays = 0;
  const cursor = new Date();
  while (days[formatDate(cursor)]) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const stats = {
    totalNotes: notes.data.length,
    totalBooks: Object.keys(books).length,
    weekReadingScore: formatScore(weekReadingScore),
    weekReadingScoreDisplay: formatScore(weekReadingScore),
    totalReadingScore: formatScore(totalReadingScore),
    totalReadingScoreDisplay: formatScore(totalReadingScore),
    streakDays
  };

  const users = await db.collection('users').where({ _openid: openid }).get();
  if (users.data.length) {
    await db.collection('users').doc(users.data[0]._id).update({ data: { stats } });
  } else {
    await db.collection('users').add({
      data: {
        _openid: openid,
        nickname: '',
        avatar: '',
        bio: '',
        stats,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  return { stats };
};
