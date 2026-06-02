const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

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

exports.main = async () => {
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const notes = await db.collection('notes').where({
    isDeleted: _.neq(true),
    visibility: _.neq('private'),
    createdAt: _.gte(weekStart).and(_.lte(weekEnd))
  }).limit(1000).get();

  const users = await db.collection('users').get();
  const userMap = users.data.reduce((map, user) => {
    map[user._openid] = user;
    return map;
  }, {});

  const grouped = {};
  notes.data.forEach((note) => {
    if (!grouped[note._openid]) grouped[note._openid] = { openid: note._openid, noteCount: 0, readingScore: 0 };
    grouped[note._openid].noteCount += 1;
    grouped[note._openid].readingScore += getReadingScore(note);
  });

  const rankings = Object.keys(grouped)
    .map((openid) => ({
      openid,
      nickname: userMap[openid] ? userMap[openid].nickname : '读者',
      avatar: userMap[openid] ? userMap[openid].avatar : '',
      noteCount: grouped[openid].noteCount,
      readingScore: grouped[openid].readingScore,
      readingScoreText: formatScore(grouped[openid].readingScore),
      readingScoreDisplay: `${formatScore(grouped[openid].readingScore)} 分`
    }))
    .filter((item) => item.readingScore > 0)
    .sort((a, b) => b.readingScore - a.readingScore || b.noteCount - a.noteCount)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  const archive = {
    weekStart,
    weekEnd,
    rankings,
    totalNotes: notes.data.length,
    archivedAt: new Date()
  };

  await db.collection('weekly_rankings').add({ data: archive });
  return archive;
};
