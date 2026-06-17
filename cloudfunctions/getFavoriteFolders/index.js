const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function ensureDefaultFolder(openid) {
  const folders = db.collection('favorite_folders');
  const exists = await folders.where({ _openid: openid, isDefault: true }).limit(1).get();
  if (exists.data.length) return exists.data[0];

  const now = new Date();
  const data = {
    _openid: openid,
    name: '默认收藏夹',
    sort: 0,
    isDefault: true,
    isPublic: false, // 核心修改：默认收藏夹为私密
    createdAt: now,
    updatedAt: now
  };
  const result = await folders.add({ data });
  return { ...data, _id: result._id };
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  await ensureDefaultFolder(OPENID);
  const result = await db.collection('favorite_folders')
    .where({ _openid: OPENID })
    .orderBy('sort', 'asc')
    .orderBy('createdAt', 'asc')
    .get();

  return { list: result.data };
};