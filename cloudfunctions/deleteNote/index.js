const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const noteId = event.noteId || event._id || '';
  if (!noteId) throw new Error('缺少笔记 ID');

  const result = await db.collection('notes').where({
    _id: noteId,
    _openid: OPENID,
    isDeleted: db.command.neq(true)
  }).update({
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date()
    }
  });

  return {
    deleted: result.stats.updated > 0
  };
};
