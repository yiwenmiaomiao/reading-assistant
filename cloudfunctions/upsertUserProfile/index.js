const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function normalizeProfile(event = {}) {
  return {
    nickname: `${event.nickname || event.nickName || ''}`.trim(),
    avatar: `${event.avatar || event.avatarUrl || ''}`.trim(),
    bio: `${event.bio || ''}`.trim()
  };
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const profile = normalizeProfile(event);
  const users = db.collection('users');
  const now = new Date();
  const exists = await users.where({ _openid: OPENID }).limit(1).get();

  if (exists.data.length) {
    const current = exists.data[0];
    const data = {
      updatedAt: now
    };

    if (profile.nickname) data.nickname = profile.nickname;
    if (profile.avatar) data.avatar = profile.avatar;
    if (profile.bio) data.bio = profile.bio;

    await users.doc(current._id).update({ data });
    await ensureDefaultFavoriteFolder(OPENID);
    return {
      user: {
        ...current,
        ...data,
        _openid: OPENID
      }
    };
  }

  const data = {
    _openid: OPENID,
    nickname: profile.nickname,
    avatar: profile.avatar,
    bio: profile.bio,
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
  const result = await users.add({ data });

  await ensureDefaultFavoriteFolder(OPENID);

  return {
    user: {
      ...data,
      _id: result._id
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
