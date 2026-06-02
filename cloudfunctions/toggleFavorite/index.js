const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

async function ensureDefaultFolder(openid) {
  const folders = db.collection('favorite_folders');
  const exists = await folders.where({
    _openid: openid,
    isDefault: true
  }).limit(1).get();

  if (exists.data.length) return exists.data[0];

  const now = new Date();
  const data = {
    _openid: openid,
    name: '默认收藏夹',
    sort: 0,
    isDefault: true,
    createdAt: now,
    updatedAt: now
  };
  const result = await folders.add({ data });
  return { ...data, _id: result._id };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const noteId = event.noteId || '';
  if (!noteId) throw new Error('缺少笔记 ID');

  const noteResult = await db.collection('notes').where({
    _id: noteId,
    isDeleted: _.neq(true)
  }).limit(1).get();

  if (!noteResult.data.length) {
    throw new Error('笔记不存在');
  }

  const note = noteResult.data[0];
  const exists = await db.collection('favorites').where({
    _openid: OPENID,
    noteId
  }).get();

  if (exists.data.length) {
    await db.collection('favorites').doc(exists.data[0]._id).remove();
    await db.collection('favorite_items').where({
      _openid: OPENID,
      targetType: 'note',
      targetId: noteId
    }).remove();
    const countResult = await db.collection('favorites').where({ noteId }).count();
    await db.collection('notes').doc(noteId).update({
      data: {
        favoriteCount: countResult.total,
        updatedAt: new Date()
      }
    });
    return { isFavorite: false, favoriteCount: countResult.total };
  }

  const folder = await ensureDefaultFolder(OPENID);
  await db.collection('favorites').add({
    data: {
      _openid: OPENID,
      noteId,
      authorOpenid: note._openid,
      createdAt: new Date()
    }
  });
  await db.collection('favorite_items').add({
    data: {
      _openid: OPENID,
      folderId: folder._id,
      targetType: 'note',
      targetId: noteId,
      authorOpenid: note._openid,
      createdAt: new Date()
    }
  });
  const countResult = await db.collection('favorites').where({ noteId }).count();
  await db.collection('notes').doc(noteId).update({
    data: {
      favoriteCount: countResult.total,
      updatedAt: new Date()
    }
  });

  return { isFavorite: true, favoriteCount: countResult.total };
};
