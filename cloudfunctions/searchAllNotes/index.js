const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

async function enrichNotes(notes, openid) {
  if (!notes.length) return [];

  const noteIds = notes.map((note) => note._id);
  const authorIds = [...new Set(notes.map((note) => note._openid).filter(Boolean))];
  const favorites = await db.collection('favorites').where({
    noteId: _.in(noteIds)
  }).limit(1000).get();
  const users = authorIds.length
    ? await db.collection('users').where({ _openid: _.in(authorIds) }).limit(200).get()
    : { data: [] };
  const userMap = users.data.reduce((map, user) => {
    map[user._openid] = user;
    return map;
  }, {});
  const favoriteCounts = favorites.data.reduce((map, favorite) => {
    map[favorite.noteId] = (map[favorite.noteId] || 0) + 1;
    return map;
  }, {});
  const myFavoriteIds = favorites.data
    .filter((favorite) => favorite._openid === openid)
    .map((favorite) => favorite.noteId);

  return notes.map((note) => {
    const favoriteCount = typeof note.favoriteCount === 'number'
      ? note.favoriteCount
      : favoriteCounts[note._id] || 0;
    return {
      ...note,
      user: userMap[note._openid] || {},
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
    isDeleted: _.neq(true),
    visibility: _.neq('private')
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

  const query = filters.length > 1 ? _.and(filters) : where;
  const result = await db.collection('notes')
    .where(query)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();
  const totalResult = await db.collection('notes')
    .where(query)
    .count();

  const list = await enrichNotes(result.data, OPENID);

  return {
    list,
    total: totalResult.total,
    hasMore: page * pageSize < totalResult.total,
    page,
    pageSize
  };
};
