const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

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

exports.main = async () => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  
  const todayQuery = {
    isDeleted: _.neq(true),
    visibility: _.neq('private'),
    createdAt: _.gte(todayStart)
  };
  const weekQuery = {
    isDeleted: _.neq(true),
    visibility: _.neq('private'),
    createdAt: _.gte(weekStart)
  };

  // ====== 性能优化：显式指定 .limit(1000)，防止超出云函数默认的 100 条限制 ======
  const todayResult = await db.collection('notes').where(todayQuery).limit(1000).get();
  const weekResult = await db.collection('notes').where(weekQuery).limit(1000).get();

  const grouped = {};
  weekResult.data.forEach((note) => {
    const openid = note._openid;
    if (!grouped[openid]) {
      grouped[openid] = { openid, noteCount: 0, readingScore: 0, books: {} };
    }
    grouped[openid].noteCount += 1;
    grouped[openid].readingScore += getReadingScore(note);
    if (note.bookTitle) {
      grouped[openid].books[note.bookTitle] = true;
    }
  });

  // ====== 性能优化：拉取用户基础资料用于匹配时，也放大到 1000 条限制 ======
  const usersResult = await db.collection('users').limit(1000).get();
  const users = usersResult.data.reduce((map, user) => {
    map[user._openid] = user;
    return map;
  }, {});

  const rankings = Object.keys(grouped)
    .map((openid) => {
      const user = users[openid] || {};
      return {
        openid,
        nickname: user.nickname || '读者',
        avatar: user.avatar || '',
        noteCount: grouped[openid].noteCount,
        bookCount: Object.keys(grouped[openid].books).length,
        readingScore: grouped[openid].readingScore,
        readingScoreText: formatScore(grouped[openid].readingScore),
        readingScoreDisplay: `${formatScore(grouped[openid].readingScore)} 分`
      };
    })
    .filter((item) => item.readingScore > 0)
    .sort((a, b) => b.readingScore - a.readingScore || b.noteCount - a.noteCount || b.bookCount - a.bookCount);

  return {
    todayCount: todayResult.data.length,
    weekCount: weekResult.data.length,
    rankings,
    topThree: rankings.slice(0, 3)
  };
};