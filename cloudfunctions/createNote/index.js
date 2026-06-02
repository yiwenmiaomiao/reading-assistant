const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

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

function getCheckinDate(date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function dateFromYmd(ymd) {
  const parts = `${ymd || ''}`.split('-').map((item) => Number(item));
  if (parts.length !== 3 || parts.some((item) => !item)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}

async function ensureBook(bookTitle, openid) {
  const title = `${bookTitle || ''}`.trim();
  if (!title) return null;

  const books = db.collection('books');
  const exists = await books.where({ title }).limit(1).get();
  if (exists.data.length) return exists.data[0];

  const now = new Date();
  const data = {
    title,
    author: '',
    cover: '',
    isbn: '',
    publisher: '',
    description: '',
    ratingAvg: 0,
    ratingCount: 0,
    createdBy: openid,
    createdAt: now,
    updatedAt: now
  };
  const result = await books.add({ data });
  return {
    ...data,
    _id: result._id
  };
}

async function syncTags(tags, openid) {
  await Promise.all(tags.map(async (name) => {
    const exists = await db.collection('tags').where({ name }).limit(1).get();
    if (exists.data.length) {
      await db.collection('tags').doc(exists.data[0]._id).update({
        data: {
          usageCount: _.inc(1),
          updatedAt: new Date()
        }
      });
      return;
    }

    await db.collection('tags').add({
      data: {
        name,
        createdBy: openid,
        usageCount: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }));
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const bookTitle = `${event.bookTitle || ''}`.trim();
  const content = `${event.content || ''}`.trim();
  const reflection = `${event.reflection || ''}`.trim();
  const tags = normalizeTags(event.tags);

  if (!bookTitle && !content) {
    throw new Error('书名和正文不能同时为空');
  }

  const now = new Date();
  const createdAt = event.checkinDate ? dateFromYmd(event.checkinDate) || now : now;
  const book = await ensureBook(bookTitle, OPENID);
  await syncTags(tags, OPENID);

  const note = {
    _openid: OPENID,
    bookId: book ? book._id : '',
    bookTitle,
    bookTitleSnapshot: bookTitle,
    content,
    reflection,
    tags,
    images: event.images || [],
    visibility: event.visibility || 'public',
    isDeleted: false,
    favoriteCount: 0,
    readingScore: getReadingScore({ content, reflection }),
    checkinDate: event.checkinDate || getCheckinDate(createdAt),
    createdAt,
    updatedAt: now
  };

  const result = await db.collection('notes').add({ data: note });

  return {
    note: {
      ...note,
      _id: result._id
    }
  };
};
