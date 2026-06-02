const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async () => {
  const result = await db.collection('users')
    .orderBy('updatedAt', 'desc')
    .limit(200)
    .get();

  return {
    list: result.data.map((user) => ({
      _id: user._id,
      _openid: user._openid,
      nickname: user.nickname || '',
      avatar: user.avatar || '',
      bio: user.bio || '',
      stats: user.stats || {},
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }))
  };
};
