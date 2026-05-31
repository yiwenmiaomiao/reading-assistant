const dateUtil = require('./date');

const STORAGE_KEY = 'reading_notes_mvp_state_v1';
const PAGE_SIZE = 20;
function getOpenid() {
  const app = getApp();
  return (app && app.globalData && app.globalData.currentUserId) || 'user_me';
}


function nowIso() {
  return new Date().toISOString();
}

function dateFromYmd(ymd) {
  const parts = `${ymd || ''}`.split('-').map((item) => Number(item));
  if (parts.length !== 3 || parts.some((item) => !item)) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}

function isoFromYmd(ymd) {
  const date = dateFromYmd(ymd);
  return date ? date.toISOString() : nowIso();
}

function dayIso(offset) {
  return dateUtil.addDays(new Date(), offset).toISOString();
}

function createSeedState() {
  return {
    users: [
      {
        _openid: getOpenid(),
        nickname: '读者' + getOpenid().slice(-6),
        avatar: '',
        bio: '把读过的书变成可复用的思考。',
        createdAt: dayIso(-18)
      },
      {
        _openid: 'user_lin',
        nickname: '林舟',
        avatar: '',
        bio: '偏爱历史和商业传记。',
        createdAt: dayIso(-15)
      },
      {
        _openid: 'user_qing',
        nickname: '晴也',
        avatar: '',
        bio: '小说、心理学和随笔读者。',
        createdAt: dayIso(-11)
      }
    ],
    tags: [
      { _id: 'tag_1', name: '认知', createdBy: getOpenid(), createdAt: dayIso(-8) },
      { _id: 'tag_2', name: '方法论', createdBy: 'user_lin', createdAt: dayIso(-7) },
      { _id: 'tag_3', name: '小说', createdBy: 'user_qing', createdAt: dayIso(-6) }
    ],
    notes: [
      {
        _id: 'note_1',
        _openid: getOpenid(),
        bookTitle: '如何阅读一本书',
        content: '主动阅读不是把字看完，而是在阅读前提出问题，在阅读中寻找结构，在阅读后用自己的语言复述。',
        reflection: '以后每读一本非虚构书，都先写下三个问题，再开始做笔记。',
        tags: ['方法论', '认知'],
        images: [],
        isDeleted: false,
        createdAt: dayIso(0),
        updatedAt: dayIso(0)
      },
      {
        _id: 'note_2',
        _openid: 'user_lin',
        bookTitle: '置身事内',
        content: '理解地方政府的激励结构，很多宏观现象就不再只是抽象的数字，而是由具体组织和人推动出来的结果。',
        reflection: '政策阅读要同时看目标、约束和激励。',
        tags: ['认知'],
        images: [],
        isDeleted: false,
        createdAt: dayIso(-1),
        updatedAt: dayIso(-1)
      },
      {
        _id: 'note_3',
        _openid: 'user_qing',
        bookTitle: '献给阿尔吉侬的花束',
        content: '智力提升并没有自动带来幸福，关系、尊严和被理解的需求一直都在。',
        reflection: '好的小说会让抽象议题重新长出人的体温。',
        tags: ['小说'],
        images: [],
        isDeleted: false,
        createdAt: dayIso(-2),
        updatedAt: dayIso(-2)
      },
      {
        _id: 'note_4',
        _openid: getOpenid(),
        bookTitle: '深度工作',
        content: '高质量产出来自长时间无干扰的专注。真正稀缺的不是信息，而是能把信息转化为能力的注意力。',
        reflection: '把早晨第一个小时留给最难的任务。',
        tags: ['方法论'],
        images: [],
        isDeleted: false,
        createdAt: dayIso(-3),
        updatedAt: dayIso(-3)
      }
    ],
    favorites: [
      {
        _id: 'fav_1',
        _openid: getOpenid(),
        noteId: 'note_2',
        createdAt: dayIso(-1)
      }
    ]
  };
}

function load() {
  return wx.getStorageSync(STORAGE_KEY) || null;
}

function save(state) {
  wx.setStorageSync(STORAGE_KEY, state);
  return state;
}

function ensureSeed() {
  const current = load();
  if (!current) {
    save(createSeedState());
  }
}

function migrateNickname() {
  if (wx.getStorageSync('nickname_migrated')) return;

  const current = load();
  if (!current) return;

  const openid = getOpenid();
  if (openid === 'user_me') return;  // 开发工具环境，真实 openid 还没拿到，跳过

  let changed = false;

  // 1. 把 _openid === 'user_me' 的用户和笔记，全部迁移到真实 openid
  current.users.forEach((user) => {
    if (user._openid === 'user_me') {
      user._openid = openid;
      if (user.nickname === '我' || user.nickname === '读者ser_me') {
        user.nickname = '读者' + openid.slice(-6);
    }
    
      changed = true;
    }
  });

  current.notes.forEach((note) => {
    if (note._openid === 'user_me') {
      note._openid = openid;
      changed = true;
    }
  });

  current.favorites.forEach((fav) => {
    if (fav._openid === 'user_me') {
      fav._openid = openid;
      changed = true;
    }
  });

  current.tags.forEach((tag) => {
    if (tag.createdBy === 'user_me') {
      tag.createdBy = openid;
      changed = true;
    }
  });

  if (changed) {
    save(current);
    wx.setStorageSync('nickname_migrated', true);
  }
}



function state() {
  ensureSeed();
  return load();
}

function currentUser() {
  return state().users.find((user) => user._openid === getOpenid());
}

function activeNotes(baseState) {
  return baseState.notes.filter((note) => !note.isDeleted);
}

function byCreatedDesc(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function getUserMap(baseState) {
  return baseState.users.reduce((map, user) => {
    map[user._openid] = user;
    return map;
  }, {});
}

function avatarText(user) {
  return (user && user.nickname ? user.nickname : '读').slice(0, 1);
}

function getFavoriteCount(noteId, baseState) {
  return baseState.favorites.filter((item) => getFavoriteNoteId(item) === noteId).length;
}

function getFavoriteNoteId(favorite) {
  return favorite.noteId || favorite.note_id || favorite.noteID || favorite.note_id_str || '';
}

function getReadingScore(note) {
  const excerptScore = `${note.content || ''}`.trim() ? 1 : 0;
  const reflection = `${note.reflection || ''}`.trim();
  const reflectionScore = reflection.length > 20 ? 1.5 : 0;
  return excerptScore + reflectionScore;
}

function formatScore(score) {
  const value = Math.round(score * 10) / 10;
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function enrich(note, baseState) {
  const users = getUserMap(baseState);
  const user = users[note._openid] || {};
  const favorite = baseState.favorites.some((item) => item._openid === getOpenid() && getFavoriteNoteId(item) === note._id);
  const favoriteCount = typeof note.favoriteCount === 'number'
    ? note.favoriteCount
    : getFavoriteCount(note._id, baseState);

  return {
    ...note,
    user,
    avatarText: avatarText(user),
    createdLabel: dateUtil.formatDateTime(note.createdAt),
    dateYmd: dateUtil.formatDate(note.createdAt),
    excerpt: note.content.length > 80 ? `${note.content.slice(0, 80)}...` : note.content,
    tagText: note.tags.join(' / '),
    isFavorite: favorite,
    favoriteCount,
    favoriteCountText: `${favoriteCount}`
  };
}

function matchesKeyword(note, keyword) {
  const value = (keyword || '').trim().toLowerCase();
  if (!value) return true;
  const haystack = [note.bookTitle, note.content, note.reflection, note.tags.join(' ')].join(' ').toLowerCase();
  return haystack.includes(value);
}

function inDateRange(note, startDate, endDate) {
  const created = dateUtil.startOfDay(note.createdAt).getTime();
  if (startDate && created < dateUtil.startOfDay(startDate).getTime()) return false;
  if (endDate && created > dateUtil.startOfDay(endDate).getTime()) return false;
  return true;
}

function searchAllNotes(options = {}) {
  const baseState = state();
  const page = Number(options.page || 1);
  const pageSize = Number(options.pageSize || PAGE_SIZE);
  const selectedUsers = options.userIds || [];
  const filtered = activeNotes(baseState)
    .filter((note) => matchesKeyword(note, options.keyword))
    .filter((note) => inDateRange(note, options.startDate, options.endDate))
    .filter((note) => !selectedUsers.length || selectedUsers.includes(note._openid))
    .sort(byCreatedDesc);
  const start = (page - 1) * pageSize;
  return {
    list: filtered.slice(start, start + pageSize).map((note) => enrich(note, baseState)),
    total: filtered.length,
    hasMore: start + pageSize < filtered.length
  };
}

function searchMyNotes(keyword) {
  const baseState = state();
  return activeNotes(baseState)
    .filter((note) => note._openid === getOpenid())
    .filter((note) => matchesKeyword(note, keyword))
    .sort(byCreatedDesc)
    .map((note) => enrich(note, baseState));
}

function getMyNotesByDate(ymd) {
  const baseState = state();
  return activeNotes(baseState)
    .filter((note) => note._openid === getOpenid())
    .filter((note) => dateUtil.formatDate(note.createdAt) === ymd)
    .sort(byCreatedDesc)
    .map((note) => enrich(note, baseState));
}

function getNote(noteId) {
  const baseState = state();
  const note = baseState.notes.find((item) => item._id === noteId && !item.isDeleted);
  return note ? enrich(note, baseState) : null;
}

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

function syncTags(baseState, tags) {
  const existing = baseState.tags.map((tag) => tag.name.toLowerCase());
  normalizeTags(tags).forEach((name) => {
    if (!existing.includes(name.toLowerCase())) {
      baseState.tags.push({
        _id: `tag_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name,
        createdBy: getOpenid(),
        createdAt: nowIso()
      });
      existing.push(name.toLowerCase());
    }
  });
}

function saveNote(payload) {
  const baseState = state();
  const tags = normalizeTags(payload.tags);
  syncTags(baseState, tags);

  if (payload._id) {
    const index = baseState.notes.findIndex((note) => note._id === payload._id && note._openid === getOpenid());
    if (index >= 0) {
      baseState.notes[index] = {
        ...baseState.notes[index],
        bookTitle: payload.bookTitle.trim(),
        content: payload.content.trim(),
        reflection: payload.reflection.trim(),
        tags,
        images: payload.images || [],
        updatedAt: nowIso()
      };
    }
  } else {
    baseState.notes.push({
      _id: `note_${Date.now()}`,
      _openid: getOpenid(),
      bookTitle: payload.bookTitle.trim(),
      content: payload.content.trim(),
      reflection: payload.reflection.trim(),
      tags,
      images: payload.images || [],
      isDeleted: false,
      createdAt: payload.createdAt || (payload.checkinDate ? isoFromYmd(payload.checkinDate) : nowIso()),
      updatedAt: nowIso()
    });
  }

  save(baseState);
}

function deleteNote(noteId) {
  const baseState = state();
  const index = baseState.notes.findIndex((note) => note._id === noteId && note._openid === getOpenid());
  if (index >= 0) {
    baseState.notes[index].isDeleted = true;
    baseState.notes[index].updatedAt = nowIso();
    save(baseState);
    return true;
  }
  return false;
}

function toggleFavorite(noteId) {
  const baseState = state();
  const index = baseState.favorites.findIndex((item) => item._openid === getOpenid() && getFavoriteNoteId(item) === noteId);
  if (index >= 0) {
    baseState.favorites.splice(index, 1);
    save(baseState);
    return false;
  }
  baseState.favorites.push({
    _id: `fav_${Date.now()}`,
    _openid: getOpenid(),
    noteId,
    createdAt: nowIso()
  });
  save(baseState);
  return true;
}

function getFavorites() {
  const baseState = state();
  const noteIds = baseState.favorites
    .filter((item) => item._openid === getOpenid())
    .map((item) => getFavoriteNoteId(item));
  return activeNotes(baseState)
    .filter((note) => noteIds.includes(note._id))
    .sort(byCreatedDesc)
    .map((note) => enrich(note, baseState));
}

function getTags() {
  return state().tags.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

function createTag(name) {
  const tagName = `${name || ''}`.trim();
  if (!tagName) return null;
  const baseState = state();
  const exists = baseState.tags.find((tag) => tag.name.toLowerCase() === tagName.toLowerCase());
  if (exists) return exists;

  const tag = {
    _id: `tag_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: tagName,
    createdBy: getOpenid(),
    createdAt: nowIso()
  };
  baseState.tags.push(tag);
  save(baseState);
  return tag;
}

function getUsers() {
  return state().users.map((user) => ({
    ...user,
    avatarText: avatarText(user)
  }));
}

function getPlatformStats() {
  const baseState = state();
  const notes = activeNotes(baseState);
  const today = new Date();
  const weekStart = dateUtil.startOfWeek(today).getTime();
  const todayCount = notes.filter((note) => dateUtil.isSameDay(note.createdAt, today)).length;
  const weekNotes = notes.filter((note) => new Date(note.createdAt).getTime() >= weekStart);
  const rankings = baseState.users
    .map((user) => {
      const userWeekNotes = weekNotes.filter((note) => note._openid === user._openid);
      const books = {};
      userWeekNotes.forEach((note) => {
        if (note.bookTitle) books[note.bookTitle] = true;
      });
      return {
        openid: user._openid,
        nickname: user.nickname,
        avatar: user.avatar,
        avatarText: avatarText(user),
        noteCount: userWeekNotes.length,
        bookCount: Object.keys(books).length,
        readingScore: userWeekNotes.reduce((total, note) => total + getReadingScore(note), 0)
      };
    })
    .filter((item) => item.readingScore > 0)
    .sort((a, b) => b.readingScore - a.readingScore || b.noteCount - a.noteCount || b.bookCount - a.bookCount)
    .map((item, index) => ({
      ...item,
      readingScoreText: formatScore(item.readingScore),
      readingScoreDisplay: `${formatScore(item.readingScore)} 分`,
      rank: index + 1
    }));

  return {
    todayCount,
    weekCount: weekNotes.length,
    rankings,
    topThree: rankings.slice(0, 3)
  };
}

function getMyStats() {
  const baseState = state();
  const notes = activeNotes(baseState).filter((note) => note._openid === getOpenid());
  const stats = getPlatformStats();
  const myRank = stats.rankings.find((item) => item.openid === getOpenid());
  const books = {};
  const days = {};
  const weekStart = dateUtil.startOfWeek(new Date()).getTime();
  let totalReadingScore = 0;
  let weekReadingScore = 0;

  notes.forEach((note) => {
    if (note.bookTitle) books[note.bookTitle] = true;
    days[dateUtil.formatDate(note.createdAt)] = true;
    const score = getReadingScore(note);
    totalReadingScore += score;

    if (new Date(note.createdAt).getTime() >= weekStart) {
      weekReadingScore += score;
    }
  });

  let streakDays = 0;
  let cursor = new Date();
  while (days[dateUtil.formatDate(cursor)]) {
    streakDays += 1;
    cursor = dateUtil.addDays(cursor, -1);
  }

  return {
    totalNotes: notes.length,
    totalBooks: Object.keys(books).length,
    weekReadingScore: formatScore(weekReadingScore),
    weekReadingScoreDisplay: formatScore(weekReadingScore),
    totalReadingScore: formatScore(totalReadingScore),
    totalReadingScoreDisplay: formatScore(totalReadingScore),
    weekRank: myRank ? myRank.rank : 0,
    streakDays
  };
}

function isCheckedToday(baseState = state()) {
  const today = new Date();
  return activeNotes(baseState).some((note) => (
    note._openid === getOpenid() && dateUtil.isSameDay(note.createdAt, today)
  ));
}

function getCheckinMonth(year, month) {
  const baseState = state();
  const today = new Date();
  const targetYear = Number(year) || today.getFullYear();
  const targetMonth = Number(month) || today.getMonth() + 1;
  const firstDay = new Date(targetYear, targetMonth - 1, 1);
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const notes = activeNotes(baseState).filter((note) => note._openid === getOpenid());
  const notesByDate = notes.reduce((map, note) => {
    const ymd = dateUtil.formatDate(note.createdAt);
    map[ymd] = (map[ymd] || 0) + 1;
    return map;
  }, {});
  const cells = [];

  for (let index = 0; index < leadingBlanks; index += 1) {
    cells.push({
      key: `blank_start_${index}`,
      isBlank: true,
      className: 'calendar-day blank'
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(targetYear, targetMonth - 1, day);
    const ymd = dateUtil.formatDate(date);
    const checked = !!notesByDate[ymd];
    const isToday = dateUtil.isSameDay(date, today);
    const isFuture = dateUtil.startOfDay(date).getTime() > dateUtil.startOfDay(today).getTime();
    const classNames = ['calendar-day', checked ? 'checked' : 'unchecked'];

    if (isToday) classNames.push('today');
    if (isFuture) classNames.push('future');

    cells.push({
      key: `day_${ymd}`,
      ymd,
      day,
      checked,
      count: notesByDate[ymd] || 0,
      isToday,
      isFuture,
      isBlank: false,
      className: classNames.join(' '),
      countText: checked ? `${notesByDate[ymd]} 条` : ''
    });
  }

  const trailingBlanks = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailingBlanks; index += 1) {
    cells.push({
      key: `blank_end_${index}`,
      isBlank: true,
      className: 'calendar-day blank'
    });
  }

  return {
    year: targetYear,
    month: targetMonth,
    monthLabel: `${targetYear}年${targetMonth < 10 ? `0${targetMonth}` : targetMonth}月`,
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    cells,
    streakDays: getMyStats().streakDays,
    isCheckedToday: isCheckedToday(baseState)
  };
}

function getReadingStats() {
  const baseState = state();
  const notes = activeNotes(baseState).filter((note) => note._openid === getOpenid());
  const books = {};
  const tags = {};
  notes.forEach((note) => {
    if (note.bookTitle) books[note.bookTitle] = (books[note.bookTitle] || 0) + 1;
    note.tags.forEach((tag) => {
      tags[tag] = (tags[tag] || 0) + 1;
    });
  });
  const toList = (map) => Object.keys(map)
    .map((name) => ({ name, count: map[name] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));
  return {
    books: toList(books),
    tags: toList(tags)
  };
}

module.exports = {
  migrateNickname,
  deleteNote,
  ensureSeed,
  getFavorites,
  getCheckinMonth,
  getMyStats,
  getMyNotesByDate,
  getNote,
  getPlatformStats,
  getReadingStats,
  getTags,
  getUsers,
  currentUser,
  createTag,
  isCheckedToday,
  saveNote,
  searchAllNotes,
  searchMyNotes,
  toggleFavorite
};
