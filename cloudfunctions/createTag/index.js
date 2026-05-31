const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const name = (event.name || '').trim();
  if (!name) throw new Error('标签名不能为空');

  const exists = await db.collection('tags').where({ name }).get();
  if (exists.data.length) return { tag: exists.data[0], created: false };

  const result = await db.collection('tags').add({
    data: {
      name,
      createdBy: OPENID,
      createdAt: new Date()
    }
  });

  return {
    tag: {
      _id: result._id,
      name,
      createdBy: OPENID
    },
    created: true
  };
};
