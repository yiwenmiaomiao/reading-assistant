const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function normalizeTags(tags) {
  const seen = {};
  return (tags || [])
    .map((tag) => `${tag}`.trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
}

function getReadingScore(note) {
  const excerptScore = `${note.content || ''}`.trim() ? 1 : 0;
  const reflection = `${note.reflection || ''}`.trim();
  return excerptScore + (reflection.length > 20 ? 1.5 : 0);
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const noteId = event._id || event.noteId || '';
  if (!noteId) throw new Error('缺少笔记 ID');

  const notes = db.collection('notes');
  const exists = await notes.where({
    _id: noteId,
    _openid: OPENID,
    isDeleted: db.command.neq(true)
  }).limit(1).get();

  if (!exists.data.length) {
    throw new Error('笔记不存在或无权编辑');
  }

  const bookTitle = `${event.bookTitle || ''}`.trim();
  const content = `${event.content || ''}`.trim();
  const reflection = `${event.reflection || ''}`.trim();
  const tags = normalizeTags(event.tags);

  if (!bookTitle && !content) {
    throw new Error('书名和正文不能同时为空');
  }

  const data = {
    bookTitle,
    bookTitleSnapshot: bookTitle,
    content,
    reflection,
    tags,
    images: event.images || [],
    visibility: event.visibility || exists.data[0].visibility || 'public',
    readingScore: getReadingScore({ content, reflection }),
    updatedAt: new Date()
  };

  await notes.doc(noteId).update({ data });

  return {
    note: {
      ...exists.data[0],
      ...data
    }
  };
};
