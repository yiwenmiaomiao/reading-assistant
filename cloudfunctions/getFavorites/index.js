const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const favorites = await db.collection('favorites').where({ _openid: OPENID }).get();
  const noteIds = favorites.data.map((item) => item.noteId);
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
  const allFavorites = await db.collection('favorites').where({
    noteId: _.in(noteIds)
  }).limit(1000).get();
  const favoriteCounts = allFavorites.data.reduce((map, favorite) => {
    map[favorite.noteId] = (map[favorite.noteId] || 0) + 1;
    return map;
  }, {});

  return {
    list: notes.data.map((note) => {
      const favoriteCount = typeof note.favoriteCount === 'number'
        ? note.favoriteCount
        : favoriteCounts[note._id] || 0;
      return {
        ...note,
        user: userMap[note._openid] || {},
        favoriteCount,
        favoriteCountText: `${favoriteCount}`,
        isFavorite: true
      };
    })
  };
};
