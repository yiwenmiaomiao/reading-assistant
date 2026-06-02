const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const title = `${event.title || event.bookTitle || ''}`.trim();
  if (!title) throw new Error('书名不能为空');

  const now = new Date();
  const payload = {
    title,
    author: `${event.author || ''}`.trim(),
    cover: `${event.cover || ''}`.trim(),
    isbn: `${event.isbn || ''}`.trim(),
    publisher: `${event.publisher || ''}`.trim(),
    description: `${event.description || ''}`.trim(),
    updatedAt: now
  };

  if (event.bookId) {
    await db.collection('books').doc(event.bookId).update({ data: payload });
    return { book: { ...payload, _id: event.bookId } };
  }

  const exists = await db.collection('books').where({ title }).limit(1).get();
  if (exists.data.length) {
    await db.collection('books').doc(exists.data[0]._id).update({ data: payload });
    return { book: { ...exists.data[0], ...payload } };
  }

  const book = {
    ...payload,
    ratingAvg: 0,
    ratingCount: 0,
    createdBy: OPENID,
    createdAt: now
  };
  const result = await db.collection('books').add({ data: book });
  return { book: { ...book, _id: result._id } };
};
