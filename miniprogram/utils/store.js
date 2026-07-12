const dateUtil = require('./date');

const STORAGE_KEY = 'reading_notes_mvp_state_v1';
const CLOUD_MIGRATED_KEY = 'reading_notes_cloud_migrated_v1';
const PAGE_SIZE = 20;
const tempFileUrlCache = {};
let _stateCache = null;  // 内存缓存，避免高频同步读 Storage

function hasCloud() {
  return !!(typeof wx !== 'undefined' && wx.cloud && wx.cloud.callFunction);
}

function callCloud(name, data = {}) {
  if (!hasCloud()) {
    return Promise.reject(new Error('cloud unavailable'));
  }

  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => resolve(res.result || {}),
      fail: reject
    });
  });
}

function uploadCloudFile(filePath, index, directory = 'note-images') {
  // 如果已经是常规网络链接，直接放行
  if (!filePath || (/^https?:\/\//.test(filePath) && !filePath.includes('tmp/'))) {
    return Promise.resolve(filePath);
  }

  const extMatch = `${filePath}`.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = extMatch ? extMatch[1] : 'jpg';

  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    
    // 异步将本地临时图片读取为 base64
    fs.readFile({
      filePath: filePath,
      encoding: 'base64',
      success: async (fileRes) => {
        try {
          const res = await callCloud('uploadToOA', {
            base64Data: fileRes.data,
            extension: ext
          });

          if (res && res.success && res.url) {
            // 公众号接口返回的是 http，强制替换为 https 保证小程序正常渲染
            let httpsUrl = res.url.trim().replace(/^http:\/\//i, 'https://');
            resolve(httpsUrl);
          } else {
            console.error('[公众号图床上传失败]', res.error);
            reject(new Error('上传图床失败'));
          }
        } catch (error) {
          console.error('[图床云函数调用失败]', error);
          reject(error);
        }
      },
      fail: reject
    });
  });
}

function uploadNoteImages(images = []) {
  return Promise.all((images || []).map((image, index) => uploadCloudFile(image, index)));
}

function uploadAvatar(avatar) {
  return uploadCloudFile(avatar, 'avatar', 'avatars');
}

function isCloudFile(filePath) {
  return /^cloud:\/\//.test(`${filePath || ''}`);
}

function isRemoteFile(filePath) {
  return /^(cloud|https?):\/\//.test(`${filePath || ''}`);
}

async function resolveCloudFileUrl(fileID) {
  if (!isCloudFile(fileID) || !wx.cloud || !wx.cloud.getTempFileURL) {
    return fileID;
  }

  if (tempFileUrlCache[fileID]) {
    return tempFileUrlCache[fileID];
  }

  const res = await new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: resolve,
      fail: reject
    });
  });
  const file = res.fileList && res.fileList[0];
  const tempFileURL = file && file.tempFileURL;
  if (tempFileURL) {
    tempFileUrlCache[fileID] = tempFileURL;
    return tempFileURL;
  }
  return fileID;
}

async function resolveNoteAssetUrls(note) {
  const next = { ...note };

  // 并行解析所有 cloud:// URL
  const tasks = [];
  const applyResults = [];

  if (next.user && isCloudFile(next.user.avatar)) {
    tasks.push(resolveCloudFileUrl(next.user.avatar));
    applyResults.push((val) => { next.user = { ...next.user, avatar: val }; });
  }
  if (next.author && isCloudFile(next.author.avatar)) {
    tasks.push(resolveCloudFileUrl(next.author.avatar));
    applyResults.push((val) => { next.author = { ...next.author, avatar: val }; });
  }
  if (next.authorAvatar && isCloudFile(next.authorAvatar)) {
    tasks.push(resolveCloudFileUrl(next.authorAvatar));
    applyResults.push((val) => { next.authorAvatar = val; });
  }
  if (Array.isArray(next.images) && next.images.length > 0) {
    tasks.push(Promise.all(
      next.images.map(img => isCloudFile(img) ? resolveCloudFileUrl(img) : img)
    ));
    applyResults.push((val) => { next.images = val; });
  }

  if (tasks.length > 0) {
    const results = await Promise.all(tasks);
    results.forEach((val, i) => applyResults[i](val));
  }

  return next;
}

async function resolveNoteListAssetUrls(list = []) {
  return Promise.all((list || []).map((note) => resolveNoteAssetUrls(note)));
}

async function resolveUserAssetUrls(user = {}) {
  if (!isCloudFile(user.avatar)) return user;
  return {
    ...user,
    avatar: await resolveCloudFileUrl(user.avatar)
  };
}

async function resolveUserListAssetUrls(list = []) {
  return Promise.all((list || []).map((user) => resolveUserAssetUrls(user)));
}

function withLocalFallback(promise, fallback, label) {
  return promise.catch((error) => {
    console.warn(`[store] cloud ${label || 'request'} fallback`, error);
    return fallback();
  });
}

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
    users: [],
    tags: [],
    notes: [],
    favorites: []
  };
}

function load() {
  // 内存缓存：避免每次都同步读 Storage
  if (_stateCache) return _stateCache;
  _stateCache = wx.getStorageSync(STORAGE_KEY) || null;
  return _stateCache;
}

function save(state) {
  _stateCache = state;
  wx.setStorageSync(STORAGE_KEY, state);
  return state;
}

function ensureSeed() {
  if (_stateCache) return;
  const current = wx.getStorageSync(STORAGE_KEY);
  if (!current) {
    save(createSeedState());
  } else {
    _stateCache = current;
  }
}

function shouldMigrateLocalToCloud() {
  const openid = getOpenid();
  if (!openid || openid === 'user_me') return false;
  if (wx.getStorageSync(`${CLOUD_MIGRATED_KEY}_${openid}`)) return false;
  const current = load();
  return !!(current && Array.isArray(current.notes) && current.notes.length);
}

function defaultNickname(openid = getOpenid()) {
  return openid === 'user_me' ? '读者' : `读者${openid.slice(-6)}`;
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
      if (user.nickname === '我' || user.nickname === '读者ser_me'|| user.nickname === '读者') {
        user.nickname = defaultNickname(openid);
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
  if (_stateCache) return _stateCache;
  ensureSeed();
  return _stateCache;
}

function currentUser() {
  const baseState = state();
  const openid = getOpenid();
  let user = baseState.users.find((item) => item._openid === openid);
  if (!user) {
    user = {
      _openid: openid,
      nickname: defaultNickname(openid),
      avatar: '',
      bio: '把读过的书变成可复用的思考。',
      createdAt: nowIso()
    };
    baseState.users.push(user);
    save(baseState);
  }
  return user;
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

function toDateValue(value) {
  if (!value) return nowIso();
  if (value instanceof Date) return value;
  if (value.$date) return value.$date;
  return value;
}

function formatUser(user = {}) {
  const nickname = user.nickname || defaultNickname(user._openid || getOpenid());
  const avatar = `${user.avatar || ''}`;
  return {
    ...user,
    nickname,
    avatar: isRemoteFile(avatar) ? avatar : '',
    avatarText: avatarText({ nickname })
  };
}

function formatNote(note = {}) {
  const tags = Array.isArray(note.tags) ? note.tags : [];
  const images = Array.isArray(note.images) ? note.images : [];
  const rawUser = note.user || note.author || { 
    _openid: note._openid,
    nickname: note.authorNickname || '',
    avatar: note.authorAvatar || ''
  };
  const user = formatUser(note.user || { _openid: note._openid });
  const content = `${note.content || ''}`;
  const createdAt = toDateValue(note.createdAt);
  const favoriteCount = typeof note.favoriteCount === 'number' ? note.favoriteCount : 0;

  return {
    ...note,
    bookTitle: note.bookTitle || note.bookTitleSnapshot || '',
    content,
    reflection: `${note.reflection || ''}`,
    tags,
    images,
    user,
    avatarText: avatarText(user),
    createdAt,
    createdLabel: dateUtil.formatDateTime(createdAt),
    dateYmd: note.checkinDate || dateUtil.formatDate(createdAt),
    excerpt: content.length > 80 ? `${content.slice(0, 80)}...` : content,
    tagText: tags.join(' / '),
    isFavorite: !!note.isFavorite,
    favoriteCount,
    favoriteCountText: `${favoriteCount}`
  };
}

function updateCurrentUserProfile(profile = {}) {
  const baseState = state();
  const openid = getOpenid();
  const nickname = `${profile.nickname || profile.nickName || ''}`.trim();
  const avatar = `${profile.avatar || profile.avatarUrl || ''}`.trim();
  let user = baseState.users.find((item) => item._openid === openid);

  if (!user) {
    user = {
      _openid: openid,
      nickname: nickname || defaultNickname(openid),
      avatar,
      bio: '把读过的书变成可复用的思考。',
      createdAt: nowIso()
    };
    baseState.users.push(user);
  } else {
    if (nickname) user.nickname = nickname;
    if (avatar) user.avatar = avatar;
    user.updatedAt = nowIso();
  }

  save(baseState);
  return {
    ...user,
    avatarText: avatarText(user)
  };
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

  const rawUser = note.user || note.author || {
    _openid: note._openid,
    nickname: note.authorNickname || '',
    avatar: note.authorAvatar || ''
  };

  const user = formatUser({
    _openid: note._openid,
    ...(users[note._openid] || {})
  });
  const favorite = baseState.favorites.some((item) => item._openid === getOpenid() && getFavoriteNoteId(item) === note._id);
  const favoriteCount = typeof note.favoriteCount === 'number'
    ? note.favoriteCount
    : getFavoriteCount(note._id, baseState);
  const tags = Array.isArray(note.tags) ? note.tags : [];
  const content = `${note.content || ''}`;

  return {
    ...note,
    user,
    avatarText: avatarText(user),
    createdLabel: dateUtil.formatDateTime(note.createdAt),
    dateYmd: dateUtil.formatDate(note.createdAt),
    excerpt: content.length > 80 ? `${content.slice(0, 80)}...` : content,
    tagText: tags.join(' / '),
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

function syncCurrentUserToLocal(user) {
  if (!user) return currentUser();
  const baseState = state();
  const openid = user._openid || getOpenid();
  const index = baseState.users.findIndex((item) => item._openid === openid);
  const next = {
    ...(index >= 0 ? baseState.users[index] : {}),
    ...user,
    _openid: openid
  };

  if (index >= 0) {
    baseState.users[index] = next;
  } else {
    baseState.users.push(next);
  }

  save(baseState);
  return formatUser(next);
}

function updateLocalNote(note) {
  if (!note || !note._id) return;
  const baseState = state();
  const index = baseState.notes.findIndex((item) => item._id === note._id);
  const normalized = {
    ...note,
    tags: Array.isArray(note.tags) ? note.tags : [],
    images: Array.isArray(note.images) ? note.images : [],
    createdAt: toDateValue(note.createdAt),
    updatedAt: toDateValue(note.updatedAt)
  };

  if (index >= 0) {
    baseState.notes[index] = {
      ...baseState.notes[index],
      ...normalized
    };
  } else {
    baseState.notes.push(normalized);
  }

  save(baseState);
}

async function currentUserAsync() {
  return withLocalFallback(
    callCloud('getCurrentUser').then((res) => syncCurrentUserToLocal(res.user)),
    () => formatUser(currentUser()),
    'getCurrentUser'
  );
}

async function migrateLocalDataToCloudAsync() {
  if (!shouldMigrateLocalToCloud()) {
    return { migrated: false, skipped: true };
  }

  const openid = getOpenid();
  const current = load();

  // ====== 🛡️ 核心修复：拦截线上手机残留的旧缓存脏数据 ======
  const mockNoteIds = ['note_1', 'note_2', 'note_3', 'note_4'];
  const mockFavIds = ['fav_1'];
  const mockUserIds = ['user_lin', 'user_qing', 'user_me'];

  // 只保留真正的用户数据
  const realNotes = (current.notes || []).filter(note => !mockNoteIds.includes(note._id));
  const realFavs = (current.favorites || []).filter(fav => !mockFavIds.includes(fav._id));
  const realUsers = (current.users || []).filter(user => !mockUserIds.includes(user._openid));

  // 如果过滤完发现根本没有真实笔记，就直接打上“已迁移”的标记，并终止上传
  if (realNotes.length === 0) {
    wx.setStorageSync(`${CLOUD_MIGRATED_KEY}_${openid}`, true);
    return { migrated: false, skipped: true };
  }
  
  return withLocalFallback(
    callCloud('importLocalData', {
      users: current.users || [],
      notes: current.notes || [],
      favorites: current.favorites || []
    }).then((res) => {
      wx.setStorageSync(`${CLOUD_MIGRATED_KEY}_${openid}`, true);
      return {
        ...res,
        migrated: true
      };
    }),
    () => ({ migrated: false, skipped: true }),
    'importLocalData'
  );
}

async function updateCurrentUserProfileAsync(profile = {}) {
  const avatar = profile.avatar || profile.avatarUrl || '';

  return withLocalFallback(
    (async () => {
      const nextProfile = {
        ...profile,
        avatar: avatar ? await uploadAvatar(avatar) : avatar
      };
      const res = await callCloud('upsertUserProfile', nextProfile);
      return syncCurrentUserToLocal(res.user);
    })(),
    () => updateCurrentUserProfile(profile),
    'upsertUserProfile'
  );
}

async function getUsersAsync() {
  return withLocalFallback(
    callCloud('getUsers').then(async (res) => {
      const list = await resolveUserListAssetUrls(res.list || []);
      return list.map(formatUser);
    }),
    () => getUsers(),
    'getUsers'
  );
}

async function searchAllNotesAsync(options = {}) {
  return withLocalFallback(
    callCloud('searchAllNotes', {
      ...options,
      pageSize: options.pageSize || PAGE_SIZE
    }).then(async (res) => {
      const list = await resolveNoteListAssetUrls(res.list || []);
      return {
        list: list.map(formatNote),
        total: res.total || 0,
        hasMore: !!res.hasMore,
        page: res.page || options.page || 1,
        pageSize: res.pageSize || options.pageSize || PAGE_SIZE
      };
    }),
    () => searchAllNotes(options),
    'searchAllNotes'
  );
}

async function searchMyNotesAsync(keyword = '') {
  return withLocalFallback(
    callCloud('searchMyNotes', { keyword }).then(async (res) => {
      const list = await resolveNoteListAssetUrls(res.list || []);
      return list.map(formatNote);
    }),
    () => searchMyNotes(keyword),
    'searchMyNotes'
  );
}

async function getMyNotesByDateAsync(ymd) {
  return withLocalFallback(
    callCloud('searchMyNotes', { date: ymd }).then(async (res) => {
      const list = await resolveNoteListAssetUrls(res.list || []);
      return list.map(formatNote);
    }),
    () => getMyNotesByDate(ymd),
    'getMyNotesByDate'
  );
}

async function getNoteAsync(noteId) {
  return withLocalFallback(
    callCloud('getNote', { noteId }).then(async (res) => (res.note ? formatNote(await resolveNoteAssetUrls(res.note)) : null)),
    () => getNote(noteId),
    'getNote'
  );
}

async function getFavoritesAsync() {
  return withLocalFallback(
    callCloud('getFavorites').then(async (res) => {
      const list = await resolveNoteListAssetUrls(res.list || []);
      return list.map(formatNote);
    }),
    () => getFavorites(),
    'getFavorites'
  );
}

async function getTagsAsync() {
  return withLocalFallback(
    callCloud('getTags').then((res) => res.list || []),
    () => getTags(),
    'getTags'
  );
}

async function createTagAsync(name) {
  return withLocalFallback(
    callCloud('createTag', { name }).then((res) => res.tag || null),
    () => createTag(name),
    'createTag'
  );
}

async function saveNoteAsync(payload = {}) {
  return withLocalFallback(
    (async () => {
      const images = await uploadNoteImages(payload.images || []);
      const data = {
        ...payload,
        images
      };
      const res = payload._id
        ? await callCloud('updateNote', data)
        : await callCloud('createNote', data);
      updateLocalNote(res.note);
      return res.note ? formatNote(res.note) : null;
    })(),
    () => {
      saveNote(payload);
      return null;
    },
    payload._id ? 'updateNote' : 'createNote'
  );
}

async function deleteNoteAsync(noteId) {
  return withLocalFallback(
    callCloud('deleteNote', { noteId }).then((res) => !!res.deleted),
    () => deleteNote(noteId),
    'deleteNote'
  );
}

async function toggleFavoriteAsync(noteId) {
  return withLocalFallback(
    callCloud('toggleFavorite', { noteId }).then((res) => ({
      isFavorite: !!res.isFavorite,
      favoriteCount: typeof res.favoriteCount === 'number' ? res.favoriteCount : 0
    })),
    () => {
      const isFavorite = toggleFavorite(noteId);
      return {
        isFavorite,
        favoriteCount: getFavoriteCount(noteId, state())
      };
    },
    'toggleFavorite'
  );
}

async function getPlatformStatsAsync() {
  return withLocalFallback(
    callCloud('getPlatformStats').then(async (stats) => {
      const topThree = await resolveUserListAssetUrls(stats.topThree || []);
      const rankings = await resolveUserListAssetUrls(stats.rankings || []);
      return {
        ...stats,
        topThree: topThree.map((item) => ({
          ...item,
          avatarText: avatarText(item),
          readingScoreDisplay: item.readingScoreDisplay || `${item.readingScoreText || item.readingScore || 0} 分`
        })),
        rankings: rankings.map((item) => ({
          ...item,
          avatarText: avatarText(item),
          readingScoreDisplay: item.readingScoreDisplay || `${item.readingScoreText || item.readingScore || 0} 分`
        }))
      };
    }),
    () => getPlatformStats(),
    'getPlatformStats'
  );
}

async function getMyStatsAsync() {
  return withLocalFallback(
    Promise.all([
      callCloud('updateUserStats'),
      callCloud('getPlatformStats')
    ]).then(([statsRes, platformStats]) => {
      const stats = statsRes.stats || {};
      const myRank = (platformStats.rankings || []).find((item) => item.openid === getOpenid());
      return {
        totalNotes: stats.totalNotes || 0,
        totalBooks: stats.totalBooks || 0,
        weekReadingScore: stats.weekReadingScore || '0',
        weekReadingScoreDisplay: stats.weekReadingScoreDisplay || stats.weekReadingScore || '0',
        totalReadingScore: stats.totalReadingScore || '0',
        totalReadingScoreDisplay: stats.totalReadingScoreDisplay || stats.totalReadingScore || '0',
        weekRank: myRank ? myRank.rank : 0,
        streakDays: stats.streakDays || 0
      };
    }),
    () => getMyStats(),
    'getMyStats'
  );
}

async function getCheckinMonthAsync(year, month) {
  return withLocalFallback(
    callCloud('getCheckinMonth', { year, month }).then((res) => res.month || getCheckinMonth(year, month)),
    () => getCheckinMonth(year, month),
    'getCheckinMonth'
  );
}

async function getReadingStatsAsync() {
  return withLocalFallback(
    callCloud('getReadingStats').then((res) => res.stats || { books: [], tags: [] }),
    () => getReadingStats(),
    'getReadingStats'
  );
}

// ===== 轨迹数据 =====

const TRAJECTORY_COLOR_PALETTE = [
  '#8049b4', '#3d7df0', '#34d399', '#f59e0b',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316'
];

const _trajectoryCache = {};

function formatYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getNoteYmd(note) {
  if (note.checkinDate) return note.checkinDate;
  return formatYmd(new Date(toDateValue(note.createdAt)));
}

function getTrajectoryLocal(mode) {
  const baseState = state();
  const notes = activeNotes(baseState).filter((note) => note._openid === getOpenid());

  if (!notes.length) {
    return { mode, books: [], xLabels: [], nodes: [] };
  }

  const bookCounts = {};
  notes.forEach((note) => {
    const title = note.bookTitle || '未分类';
    bookCounts[title] = (bookCounts[title] || 0) + 1;
  });

  const bookNames = Object.keys(bookCounts).sort((a, b) => bookCounts[b] - bookCounts[a]);
  const books = bookNames.map((name, i) => {
    const ratio = bookNames.length === 1 ? 0.5 : i / (bookNames.length - 1);
    return {
      name,
      count: bookCounts[name],
      color: TRAJECTORY_COLOR_PALETTE[i % TRAJECTORY_COLOR_PALETTE.length],
      y: 0.12 + ratio * 0.76
    };
  });

  let xLabels = [];
  let nodes = [];

  if (mode === 'day') {
    // 日维度：首张笔记日期 → 最新笔记日期（全量）
    const noteDates = notes.map((n) => getNoteYmd(n)).sort();
    const firstYmd = noteDates[0];
    const lastYmd = noteDates[noteDates.length - 1];
    const [fy, fm, fd] = firstYmd.split('-').map(Number);
    const [ly, lm, ld] = lastYmd.split('-').map(Number);
    const start = new Date(fy, fm - 1, fd);
    const end = new Date(ly, lm - 1, ld);

    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    xLabels = days.map((d) => `${d.getMonth() + 1}/${d.getDate()}`);

    days.forEach((d, idx) => {
      const ymd = formatYmd(d);
      const dayNotes = notes.filter((n) => getNoteYmd(n) === ymd);
      if (!dayNotes.length) {
        nodes.push({ x: idx, type: 'pause', day: ymd });
        return;
      }
      const grouped = {};
      dayNotes.forEach((note) => {
        const title = note.bookTitle || '未分类';
        if (!grouped[title]) grouped[title] = { count: 0, tag: '', text: '' };
        grouped[title].count++;
        if (!grouped[title].tag && note.tags && note.tags[0]) grouped[title].tag = note.tags[0];
        if (!grouped[title].text && note.content) grouped[title].text = note.content;
      });
      Object.keys(grouped).forEach((title) => {
        nodes.push({ x: idx, bookTitle: title, ...grouped[title], day: ymd });
      });
    });
  } else if (mode === 'month') {
    // 月维度：首张笔记年月 → 最新笔记年月（全量）
    const noteMonths = notes.map((n) => {
      const d = new Date(toDateValue(n.createdAt));
      return { year: d.getFullYear(), month: d.getMonth() };
    }).sort((a, b) => (a.year - b.year) || (a.month - b.month));
    const first = noteMonths[0];
    const last = noteMonths[noteMonths.length - 1];

    const months = [];
    let y = first.year, m = first.month;
    while (y < last.year || (y === last.year && m <= last.month)) {
      months.push({ year: y, month: m });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    xLabels = months.map(({ year, month }) => `${year}/${month + 1}`);

    months.forEach(({ year, month }, idx) => {
      const monthNotes = notes.filter((n) => {
        const d = new Date(toDateValue(n.createdAt));
        return d.getFullYear() === year && d.getMonth() === month;
      });
      const grouped = {};
      monthNotes.forEach((note) => {
        const title = note.bookTitle || '未分类';
        if (!grouped[title]) grouped[title] = { count: 0, tag: '', text: '' };
        grouped[title].count++;
        if (!grouped[title].tag && note.tags && note.tags[0]) grouped[title].tag = note.tags[0];
        if (!grouped[title].text && note.content) grouped[title].text = note.content;
      });
      Object.keys(grouped).forEach((title) => {
        nodes.push({ x: idx, bookTitle: title, ...grouped[title] });
      });
    });
  } else if (mode === 'year') {
    const years = [...new Set(notes.map((n) => new Date(toDateValue(n.createdAt)).getFullYear()))].sort((a, b) => a - b);
    xLabels = years.map((y) => `${y}`);
    years.forEach((y, idx) => {
      const yearNotes = notes.filter((n) => new Date(toDateValue(n.createdAt)).getFullYear() === y);
      const grouped = {};
      yearNotes.forEach((note) => {
        const title = note.bookTitle || '未分类';
        if (!grouped[title]) grouped[title] = { count: 0, tag: '', text: '' };
        grouped[title].count++;
        if (!grouped[title].tag && note.tags && note.tags[0]) grouped[title].tag = note.tags[0];
        if (!grouped[title].text && note.content) grouped[title].text = note.content;
      });
      Object.keys(grouped).forEach((title) => {
        nodes.push({ x: idx, bookTitle: title, ...grouped[title], label: `${y}` });
      });
    });
  }

  return { mode, books, xLabels, nodes };
}

async function getTrajectoryDataAsync(mode = 'day') {
  const now = Date.now();
  const cache = _trajectoryCache[mode];
  // 5 秒节流缓存
  if (cache && now - cache.time < 5000) {
    return cache.data;
  }

  const data = await withLocalFallback(
    callCloud('getTrajectoryData', { mode }),
    () => getTrajectoryLocal(mode),
    'getTrajectoryData'
  );

  _trajectoryCache[mode] = { time: now, data };
  return data;
}

module.exports = {
  callCloud,
  createTagAsync,
  currentUserAsync,
  migrateNickname,
  deleteNote,
  deleteNoteAsync,
  ensureSeed,
  getFavorites,
  getFavoritesAsync,
  getCheckinMonth,
  getCheckinMonthAsync,
  getMyStats,
  getMyStatsAsync,
  getMyNotesByDate,
  getMyNotesByDateAsync,
  getNote,
  getNoteAsync,
  getPlatformStats,
  getPlatformStatsAsync,
  getReadingStats,
  getReadingStatsAsync,
  getTags,
  getTagsAsync,
  getTrajectoryDataAsync,
  getUsers,
  getUsersAsync,
  currentUser,
  createTag,
  isCheckedToday,
  migrateLocalDataToCloudAsync,
  saveNote,
  saveNoteAsync,
  searchAllNotes,
  searchAllNotesAsync,
  searchMyNotes,
  searchMyNotesAsync,
  toggleFavorite,
  toggleFavoriteAsync,
  updateCurrentUserProfileAsync,
  updateCurrentUserProfile
};
