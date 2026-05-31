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
    isDeleted: _.neq(true)
  }).orderBy('createdAt', 'desc').get();

  const allFavorites = await db.collection('favorites').where({
    noteId: _.in(noteIds)
  }).limit(1000).get();
  const favoriteCounts = allFavorites.data.reduce((map, favorite) => {
    map[favorite.noteId] = (map[favorite.noteId] || 0) + 1;
    return map;
  }, {});

  return {
    list: notes.data.map((note) => {
      const favoriteCount = favoriteCounts[note._id] || 0;
      return {
        ...note,
        favoriteCount,
        favoriteCountText: `${favoriteCount}`,
        isFavorite: true
      };
    })
  };
};
