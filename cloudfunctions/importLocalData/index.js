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

function formatDate(date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function toDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function upsertUser(user, openid) {
  const users = db.collection('users');
  const exists = await users.where({ _openid: openid }).limit(1).get();
  const now = new Date();
  const data = {
    _openid: openid,
    nickname: `${user.nickname || ''}`.trim(),
    avatar: `${user.avatar || ''}`.trim(),
    bio: `${user.bio || ''}`.trim(),
    updatedAt: now
  };

  if (exists.data.length) {
    await users.doc(exists.data[0]._id).update({ data });
    return;
  }

  await users.add({
    data: {
      ...data,
      stats: {
        totalNotes: 0,
        totalBooks: 0,
        weekReadingScore: '0',
        weekReadingScoreDisplay: '0',
        totalReadingScore: '0',
        totalReadingScoreDisplay: '0',
        streakDays: 0
      },
      createdAt: user.createdAt ? toDate(user.createdAt) : now
    }
  });
}

async function ensureBook(bookTitle, openid) {
  const title = `${bookTitle || ''}`.trim();
  if (!title) return '';

  const exists = await db.collection('books').where({ title }).limit(1).get();
  if (exists.data.length) return exists.data[0]._id;

  const now = new Date();
  const result = await db.collection('books').add({
    data: {
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
    }
  });
  return result._id;
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

async function importNote(note, openid) {
  const localId = `${note._id || ''}`.trim();
  if (!localId) return { imported: false, skipped: true };

  const exists = await db.collection('notes').where({
    importedLocalId: localId,
    _openid: openid
  }).limit(1).get();

  if (exists.data.length) return { imported: false, skipped: true };

  const createdAt = toDate(note.createdAt);
  const updatedAt = toDate(note.updatedAt || note.createdAt);
  const bookTitle = `${note.bookTitle || note.bookTitleSnapshot || ''}`.trim();
  const content = `${note.content || ''}`.trim();
  const reflection = `${note.reflection || ''}`.trim();
  const tags = normalizeTags(note.tags);
  const bookId = await ensureBook(bookTitle, openid);

  await syncTags(tags, openid);
  await db.collection('notes').add({
    data: {
      _openid: openid,
      importedLocalId: localId,
      bookId,
      bookTitle,
      bookTitleSnapshot: bookTitle,
      content,
      reflection,
      tags,
      images: Array.isArray(note.images) ? note.images.filter((image) => /^cloud:\/\//.test(image) || /^https?:\/\//.test(image)) : [],
      visibility: note.visibility || 'public',
      isDeleted: !!note.isDeleted,
      favoriteCount: Number(note.favoriteCount || 0),
      readingScore: getReadingScore({ content, reflection }),
      checkinDate: note.checkinDate || formatDate(createdAt),
      createdAt,
      updatedAt
    }
  });

  return { imported: true, skipped: false };
}

async function importFavorite(favorite, noteMap, openid) {
  const localNoteId = `${favorite.noteId || favorite.note_id || ''}`.trim();
  const noteId = noteMap[localNoteId];
  if (!noteId) return false;

  const exists = await db.collection('favorites').where({
    _openid: openid,
    noteId
  }).limit(1).get();

  if (exists.data.length) return false;

  await db.collection('favorites').add({
    data: {
      _openid: openid,
      noteId,
      createdAt: favorite.createdAt ? toDate(favorite.createdAt) : new Date()
    }
  });
  return true;
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const users = Array.isArray(event.users) ? event.users : [];
  const notes = Array.isArray(event.notes) ? event.notes : [];
  const favorites = Array.isArray(event.favorites) ? event.favorites : [];
  const currentUser = users.find((user) => user._openid === OPENID || user._openid === 'user_me') || users[0] || {};

  await upsertUser(currentUser, OPENID);

  let importedNotes = 0;
  let skippedNotes = 0;
  for (const note of notes) {
    if (note._openid && note._openid !== OPENID && note._openid !== 'user_me') {
      skippedNotes += 1;
      continue;
    }
    const result = await importNote(note, OPENID);
    if (result.imported) importedNotes += 1;
    if (result.skipped) skippedNotes += 1;
  }

  const imported = await db.collection('notes').where({
    _openid: OPENID,
    importedLocalId: _.exists(true)
  }).limit(1000).get();
  const noteMap = imported.data.reduce((map, note) => {
    map[note.importedLocalId] = note._id;
    return map;
  }, {});

  let importedFavorites = 0;
  for (const favorite of favorites) {
    if (favorite._openid && favorite._openid !== OPENID && favorite._openid !== 'user_me') continue;
    const importedFavorite = await importFavorite(favorite, noteMap, OPENID);
    if (importedFavorite) importedFavorites += 1;
  }

  return {
    importedNotes,
    skippedNotes,
    importedFavorites
  };
};
