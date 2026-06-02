const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const COLLECTIONS = [
  'users',
  'notes',
  'books',
  'user_books',
  'reading_logs',
  'favorites',
  'favorite_folders',
  'favorite_items',
  'tags',
  'weekly_rankings',
  'note_reads'
];

exports.main = async () => {
  const results = [];

  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name);
      results.push({ name, created: true });
    } catch (error) {
      results.push({ name, created: false, message: error.message });
    }
  }

  return {
    collections: results,
    indexes: [
      'notes: visibility + isDeleted + createdAt',
      'notes: _openid + isDeleted + createdAt',
      'notes: _openid + checkinDate',
      'favorites: _openid + noteId',
      'favorites: noteId',
      'favorite_items: _openid + folderId + targetType',
      'books: title',
      'user_books: _openid + bookId',
      'reading_logs: _openid + bookId + loggedAt',
      'weekly_rankings: weekStart'
    ]
  };
};
