const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 书籍颜色调色板
const COLOR_PALETTE = [
  '#8049b4', '#3d7df0', '#34d399', '#f59e0b',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316',
  '#6366f1', '#14b8a6', '#e11d48', '#a855f7'
];

// 上海时区偏移量（毫秒）
const CST_OFFSET = 8 * 60 * 60 * 1000;

// 将任意 Date 转为上海时区的 Date（用 UTC 方法读取）
function toCST(d) {
  return new Date(d.getTime() + CST_OFFSET);
}

// 上海时区下的日期格式化 YYYY-MM-DD
function formatDate(d) {
  const cst = toCST(d);
  const y = cst.getUTCFullYear();
  const m = String(cst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(cst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 获取笔记的上海时区日期（优先 checkinDate）
function getNoteDate(note) {
  if (note.checkinDate) return note.checkinDate;
  return formatDate(new Date(note.createdAt));
}

// 获取笔记的上海时区年份
function getNoteYear(note) {
  return toCST(new Date(note.createdAt)).getUTCFullYear();
}

// 获取笔记的上海时区月份（0-11）
function getNoteMonth(note) {
  return toCST(new Date(note.createdAt)).getUTCMonth();
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const mode = event.mode || 'day';

  // 查询当前用户所有未删除笔记
  const result = await db.collection('notes').where({
    _openid: OPENID,
    isDeleted: _.neq(true)
  }).orderBy('createdAt', 'asc').limit(1000).get();

  const notes = result.data;

  if (!notes.length) {
    return { mode, books: [], xLabels: [], nodes: [] };
  }

  // 聚合书籍列表（按笔记数降序，分配颜色和 Y 位置）
  const bookCounts = {};
  notes.forEach((note) => {
    const title = note.bookTitle || '未分类';
    bookCounts[title] = (bookCounts[title] || 0) + 1;
  });

  const bookNames = Object.keys(bookCounts)
    .sort((a, b) => bookCounts[b] - bookCounts[a]);

  const books = bookNames.map((name, i) => {
    const ratio = bookNames.length === 1 ? 0.5 : i / (bookNames.length - 1);
    return {
      name,
      count: bookCounts[name],
      color: COLOR_PALETTE[i % COLOR_PALETTE.length],
      y: 0.12 + ratio * 0.76
    };
  });

  let xLabels = [];
  let nodes = [];

  if (mode === 'day') {
    // 日维度：首张笔记日期 → 最新笔记日期（全量）
    const noteDates = notes.map((n) => getNoteDate(n)).sort();
    const firstYmd = noteDates[0];
    const lastYmd = noteDates[noteDates.length - 1];

    // 解析 YYYY-MM-DD 为上海时区 0 点（用 UTC 表示）
    const [fy, fm, fd] = firstYmd.split('-').map(Number);
    const [ly, lm, ld] = lastYmd.split('-').map(Number);
    const start = new Date(Date.UTC(fy, fm - 1, fd));
    const end = new Date(Date.UTC(ly, lm - 1, ld));

    const days = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(new Date(d));
    }
    xLabels = days.map((d) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`);

    days.forEach((d, idx) => {
      const ymd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const dayNotes = notes.filter((n) => getNoteDate(n) === ymd);
      if (dayNotes.length === 0) {
        nodes.push({ x: idx, type: 'pause', day: ymd });
      } else {
        const grouped = {};
        dayNotes.forEach((note) => {
          const title = note.bookTitle || '未分类';
          if (!grouped[title]) {
            grouped[title] = {
              count: 0,
              tag: (note.tags && note.tags[0]) || '',
              text: note.content || note.reflection || ''
            };
          }
          grouped[title].count++;
          if (!grouped[title].tag && note.tags && note.tags[0]) {
            grouped[title].tag = note.tags[0];
          }
          if (!grouped[title].text && note.content) {
            grouped[title].text = note.content;
          }
        });
        Object.keys(grouped).forEach((title) => {
          nodes.push({
            x: idx,
            bookTitle: title,
            count: grouped[title].count,
            tag: grouped[title].tag,
            text: grouped[title].text,
            day: ymd
          });
        });
      }
    });
  } else if (mode === 'month') {
    // 月维度：首张笔记年月 → 最新笔记年月（全量）
    const noteYears = notes.map((n) => getNoteYear(n)).sort((a, b) => a - b);
    const noteMonths = notes.map((n) => ({ year: getNoteYear(n), month: getNoteMonth(n) }));
    noteMonths.sort((a, b) => (a.year - b.year) || (a.month - b.month));
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
      const monthNotes = notes.filter((n) => getNoteYear(n) === year && getNoteMonth(n) === month);
      const grouped = {};
      monthNotes.forEach((note) => {
        const title = note.bookTitle || '未分类';
        if (!grouped[title]) {
          grouped[title] = {
            count: 0,
            tag: (note.tags && note.tags[0]) || '',
            text: note.content || ''
          };
        }
        grouped[title].count++;
        if (!grouped[title].tag && note.tags && note.tags[0]) {
          grouped[title].tag = note.tags[0];
        }
        if (!grouped[title].text && note.content) {
          grouped[title].text = note.content;
        }
      });
      Object.keys(grouped).forEach((title) => {
        nodes.push({
          x: idx,
          bookTitle: title,
          count: grouped[title].count,
          tag: grouped[title].tag,
          text: grouped[title].text
        });
      });
    });
  } else if (mode === 'year') {
    // 年维度：笔记覆盖的所有年份（上海时区）
    const years = [...new Set(notes.map((n) => getNoteYear(n)))].sort((a, b) => a - b);
    xLabels = years.map((y) => `${y}`);

    years.forEach((y, idx) => {
      const yearNotes = notes.filter((n) => getNoteYear(n) === y);
      const grouped = {};
      yearNotes.forEach((note) => {
        const title = note.bookTitle || '未分类';
        if (!grouped[title]) {
          grouped[title] = {
            count: 0,
            tag: (note.tags && note.tags[0]) || '',
            text: note.content || ''
          };
        }
        grouped[title].count++;
        if (!grouped[title].tag && note.tags && note.tags[0]) {
          grouped[title].tag = note.tags[0];
        }
        if (!grouped[title].text && note.content) {
          grouped[title].text = note.content;
        }
      });
      Object.keys(grouped).forEach((title) => {
        nodes.push({
          x: idx,
          bookTitle: title,
          count: grouped[title].count,
          tag: grouped[title].tag,
          text: grouped[title].text,
          label: `${y}`
        });
      });
    });
  }

  return { mode, books, xLabels, nodes };
};
