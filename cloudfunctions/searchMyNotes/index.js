const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

async function enrichNotes(notes, openid) {
  if (!notes.length) return [];

  const noteIds = notes.map((note) => note._id);
  const authorIds = [...new Set(notes.map((note) => note._openid).filter(Boolean))];
  
  // 🌟 修改点与 searchAllNotes 完全一致
  const favorites = await db.collection('favorite_items').where({
    targetId: _.in(noteIds),
    targetType: 'note'
  }).limit(1000).get();
  
  const users = authorIds.length
    ? await db.collection('users').where({ _openid: _.in(authorIds) }).limit(200).get()
    : { data: [] };
    
  const userMap = users.data.reduce((map, user) => {
    map[user._openid] = user;
    return map;
  }, {});
  
  const favoriteCounts = favorites.data.reduce((map, favorite) => {
    map[favorite.targetId] = (map[favorite.targetId] || 0) + 1;
    return map;
  }, {});
  
  const myFavoriteIds = favorites.data
    .filter((favorite) => favorite._openid === openid)
    .map((favorite) => favorite.targetId);

  return notes.map((note) => {
    const favoriteCount = typeof note.favoriteCount === 'number'
      ? note.favoriteCount
      : favoriteCounts[note._id] || 0;
    return {
      ...note,
      user: normalizeUser(userMap[note._openid], note._openid),
      favoriteCount,
      favoriteCountText: `${favoriteCount}`,
      isFavorite: myFavoriteIds.includes(note._id)
    };
  });
}

function normalizeUser(user, openid) {
  return {
    _openid: openid || (user && user._openid) || '',
    nickname: (user && user.nickname) || '',
    avatar: (user && user.avatar) || '',
    bio: (user && user.bio) || ''
  };
}

// ... 下面的 exports.main 逻辑完全保持你原来的代码不变 ...
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const keyword = (event.keyword || '').trim();
  const date = (event.date || event.checkinDate || '').trim();
  const where = {
    _openid: OPENID,
    isDeleted: _.neq(true)
  };

  if (date) {
    where.checkinDate = date;
  }

  const filters = [where];
  if (keyword) {
    const reg = db.RegExp({ regexp: keyword, options: 'i' });
    filters.push(_.or([
      { bookTitle: reg },
      { content: reg },
      { reflection: reg },
      { tags: reg }
    ]));
  }

  const query = filters.length > 1 ? _.and(filters) : where;
  const result = await db.collection('notes')
    .where(query)
    .orderBy('createdAt', 'desc')
    .limit(1000)
    .get();

  return {
    list: await enrichNotes(result.data, OPENID)
  };
};