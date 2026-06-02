const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const bookId = event.bookId || '';
  if (!bookId) throw new Error('缺少书籍 ID');

  const now = new Date();
  const data = {
    _openid: OPENID,
    bookId,
    status: event.status || 'reading',
    rating: Number(event.rating || 0),
    privateNote: `${event.privateNote || ''}`.trim(),
    startedAt: event.startedAt ? new Date(event.startedAt) : null,
    finishedAt: event.finishedAt ? new Date(event.finishedAt) : null,
    updatedAt: now
  };

  const collection = db.collection('user_books');
  const exists = await collection.where({ _openid: OPENID, bookId }).limit(1).get();

  if (exists.data.length) {
    await collection.doc(exists.data[0]._id).update({ data });
    return { userBook: { ...exists.data[0], ...data } };
  }

  const result = await collection.add({
    data: {
      ...data,
      createdAt: now
    }
  });

  return {
    userBook: {
      ...data,
      _id: result._id,
      createdAt: now
    }
  };
};
