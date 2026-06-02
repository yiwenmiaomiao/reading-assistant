const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async () => {
  const result = await db.collection('tags').orderBy('usageCount', 'desc').orderBy('name', 'asc').limit(200).get();
  return { list: result.data };
};
