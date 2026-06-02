const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const bookId = event.bookId || '';
  if (!bookId) throw new Error('缺少书籍 ID');

  const data = {
    _openid: OPENID,
    bookId,
    userBookId: event.userBookId || '',
    progressText: `${event.progressText || ''}`.trim(),
    pageFrom: Number(event.pageFrom || 0),
    pageTo: Number(event.pageTo || 0),
    minutes: Number(event.minutes || 0),
    note: `${event.note || ''}`.trim(),
    loggedAt: event.loggedAt ? new Date(event.loggedAt) : new Date(),
    createdAt: new Date()
  };

  const result = await db.collection('reading_logs').add({ data });
  return {
    log: {
      ...data,
      _id: result._id
    }
  };
};
