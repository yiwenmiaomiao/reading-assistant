const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

async function enrichNotes(notes, openid) {
  if (!notes.length) return [];

  const noteIds = notes.map((note) => note._id);
  const favorites = await db.collection('favorites').where({
    noteId: _.in(noteIds)
  }).limit(1000).get();
  const favoriteCounts = favorites.data.reduce((map, favorite) => {
    map[favorite.noteId] = (map[favorite.noteId] || 0) + 1;
    return map;
  }, {});
  const myFavoriteIds = favorites.data
    .filter((favorite) => favorite._openid === openid)
    .map((favorite) => favorite.noteId);

  return notes.map((note) => {
    const favoriteCount = favoriteCounts[note._id] || 0;
    return {
      ...note,
      favoriteCount,
      favoriteCountText: `${favoriteCount}`,
      isFavorite: myFavoriteIds.includes(note._id)
    };
  });
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const page = Number(event.page || 1);
  const pageSize = Number(event.pageSize || 20);
  const keyword = (event.keyword || '').trim();
  const where = {
    isDeleted: _.neq(true)
  };

  if (event.startDate || event.endDate) {
    let range;
    if (event.startDate) range = _.gte(new Date(event.startDate));
    if (event.endDate) {
      const end = new Date(event.endDate);
      end.setHours(23, 59, 59, 999);
      range = range ? range.and(_.lte(end)) : _.lte(end);
    }
    where.createdAt = range;
  }

  if (event.userIds && event.userIds.length) {
    where._openid = _.in(event.userIds);
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

  const result = await db.collection('notes')
    .where(filters.length > 1 ? _.and(filters) : where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  const list = await enrichNotes(result.data, OPENID);

  return {
    list,
    page,
    pageSize
  };
};
