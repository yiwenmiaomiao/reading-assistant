const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const notes = await db.collection('notes').where({
    _openid: OPENID,
    isDeleted: _.neq(true)
  }).limit(1000).get();

  const books = {};
  const tags = {};
  notes.data.forEach((note) => {
    if (note.bookTitle) books[note.bookTitle] = (books[note.bookTitle] || 0) + 1;
    (note.tags || []).forEach((tag) => {
      tags[tag] = (tags[tag] || 0) + 1;
    });
  });

  const toList = (map) => Object.keys(map)
    .map((name) => ({ name, count: map[name] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));

  return {
    stats: {
      books: toList(books),
      tags: toList(tags)
    }
  };
};
