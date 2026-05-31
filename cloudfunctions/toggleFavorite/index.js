const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const exists = await db.collection('favorites').where({
    _openid: OPENID,
    noteId: event.noteId
  }).get();

  if (exists.data.length) {
    await db.collection('favorites').doc(exists.data[0]._id).remove();
    return { isFavorite: false };
  }

  await db.collection('favorites').add({
    data: {
      noteId: event.noteId,
      createdAt: new Date()
    }
  });

  return { isFavorite: true };
};
