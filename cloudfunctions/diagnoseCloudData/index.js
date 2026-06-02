const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const [users, notes, myNotes, publicNotes, favorites] = await Promise.all([
    db.collection('users').count(),
    db.collection('notes').count(),
    db.collection('notes').where({ _openid: OPENID, isDeleted: _.neq(true) }).count(),
    db.collection('notes').where({
      isDeleted: _.neq(true),
      visibility: _.neq('private')
    }).count(),
    db.collection('favorites').where({ _openid: OPENID }).count()
  ]);

  const latestNotes = await db.collection('notes')
    .where({ isDeleted: _.neq(true) })
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  return {
    openid: OPENID,
    counts: {
      users: users.total,
      notes: notes.total,
      myNotes: myNotes.total,
      publicNotes: publicNotes.total,
      myFavorites: favorites.total
    },
    latestNotes: latestNotes.data.map((note) => ({
      _id: note._id,
      _openid: note._openid,
      bookTitle: note.bookTitle,
      visibility: note.visibility,
      isDeleted: note.isDeleted,
      createdAt: note.createdAt
    }))
  };
};
