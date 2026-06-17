const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async () => {
  const result = await db.collection('notes')
    .where(_.or([
      { author: _.exists(true) },
      { authorAvatar: _.exists(true) },
      { authorNickname: _.exists(true) }
    ]))
    .update({
      data: {
        author: _.remove(),
        authorAvatar: _.remove(),
        authorNickname: _.remove(),
        updatedAt: new Date()
      }
    });

  return {
    updated: result.stats.updated
  };
};
