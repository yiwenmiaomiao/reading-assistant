const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const noteId = event.noteId || event._id || '';
  if (!noteId) throw new Error('缺少笔记 ID');

  const result = await db.collection('notes').where({
    _id: noteId,
    isDeleted: _.neq(true)
  }).limit(1).get();

  if (!result.data.length) return { note: null };

  const note = result.data[0];
  if (note.visibility === 'private' && note._openid !== OPENID) {
    return { note: null };
  }

  const users = await db.collection('users').where({ _openid: note._openid }).limit(1).get();
  
  // 🌟 核心修改：改查 favorite_items，用 targetId
  const favorites = await db.collection('favorite_items').where({ 
    targetId: noteId,
    targetType: 'note'
  }).limit(1000).get();
  
  const favoriteCount = typeof note.favoriteCount === 'number' ? note.favoriteCount : favorites.data.length;
  const isFavorite = favorites.data.some((favorite) => favorite._openid === OPENID);

  return {
    note: {
      ...note,
      user: normalizeUser(users.data[0], note._openid),
      favoriteCount,
      favoriteCountText: `${favoriteCount}`,
      isFavorite
    }
  };
};

function normalizeUser(user, openid) {
  return {
    _openid: openid || (user && user._openid) || '',
    nickname: (user && user.nickname) || '',
    avatar: (user && user.avatar) || '',
    bio: (user && user.bio) || ''
  };
}