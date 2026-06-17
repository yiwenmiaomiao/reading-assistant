const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  
  // 核心修改：支持根据传入的 folderId 过滤（为以后的分类收藏夹页面做准备）
  const query = { 
    _openid: OPENID, 
    targetType: 'note' 
  };
  if (event.folderId) {
    query.folderId = event.folderId;
  }

  // 弃用 favorites，改查 favorite_items
  const favorites = await db.collection('favorite_items').where(query).limit(1000).get();
  
  // 去重处理（防止同一个笔记被用户放在了多个文件夹里，导致列表重复渲染）
  const noteIds = [...new Set(favorites.data.map((item) => item.targetId))];
  if (!noteIds.length) return { list: [] };

  const notes = await db.collection('notes').where({
    _id: _.in(noteIds),
    isDeleted: _.neq(true),
    visibility: _.neq('private')
  }).orderBy('createdAt', 'desc').get();

  const authorIds = [...new Set(notes.data.map((note) => note._openid).filter(Boolean))];
  const users = authorIds.length
    ? await db.collection('users').where({ _openid: _.in(authorIds) }).limit(200).get()
    : { data: [] };
  const userMap = users.data.reduce((map, user) => {
    map[user._openid] = user;
    return map;
  }, {});
  
  // 统计全站收藏数也改查 favorite_items
  const allFavorites = await db.collection('favorite_items').where({
    targetId: _.in(noteIds),
    targetType: 'note'
  }).limit(1000).get();
  const favoriteCounts = allFavorites.data.reduce((map, favorite) => {
    map[favorite.targetId] = (map[favorite.targetId] || 0) + 1;
    return map;
  }, {});

  return {
    list: notes.data.map((note) => {
      const favoriteCount = typeof note.favoriteCount === 'number'
        ? note.favoriteCount
        : favoriteCounts[note._id] || 0;
      return {
        ...note,
        user: normalizeUser(userMap[note._openid], note._openid),
        favoriteCount,
        favoriteCountText: `${favoriteCount}`,
        isFavorite: true
      };
    })
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