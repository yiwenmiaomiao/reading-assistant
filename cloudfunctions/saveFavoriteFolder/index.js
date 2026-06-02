const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const name = `${event.name || ''}`.trim();
  if (!name) throw new Error('收藏夹名称不能为空');

  const now = new Date();
  const data = {
    name,
    sort: Number(event.sort || 0),
    updatedAt: now
  };

  if (event.folderId) {
    const result = await db.collection('favorite_folders').where({
      _id: event.folderId,
      _openid: OPENID
    }).update({ data });
    return { updated: result.stats.updated > 0 };
  }

  const folder = {
    _openid: OPENID,
    ...data,
    isDefault: false,
    createdAt: now
  };
  const result = await db.collection('favorite_folders').add({ data: folder });
  return {
    folder: {
      ...folder,
      _id: result._id
    }
  };
};
