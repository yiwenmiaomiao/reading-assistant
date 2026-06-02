const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const result = await db.collection('users').where({ _openid: OPENID }).limit(1).get();

  if (result.data.length) {
    await ensureDefaultFavoriteFolder(OPENID);
    return { user: result.data[0] };
  }

  const now = new Date();
  const user = {
    _openid: OPENID,
    nickname: '',
    avatar: '',
    bio: '',
    stats: {
      totalNotes: 0,
      totalBooks: 0,
      weekReadingScore: '0',
      weekReadingScoreDisplay: '0',
      totalReadingScore: '0',
      totalReadingScoreDisplay: '0',
      streakDays: 0
    },
    createdAt: now,
    updatedAt: now
  };
  const addResult = await db.collection('users').add({ data: user });
  await ensureDefaultFavoriteFolder(OPENID);

  return {
    user: {
      ...user,
      _id: addResult._id
    }
  };
};

async function ensureDefaultFavoriteFolder(openid) {
  const folders = db.collection('favorite_folders');
  const exists = await folders.where({
    _openid: openid,
    isDefault: true
  }).limit(1).get();

  if (exists.data.length) return;

  await folders.add({
    data: {
      _openid: openid,
      name: '默认收藏夹',
      sort: 0,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
}
