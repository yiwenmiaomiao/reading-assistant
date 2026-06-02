const store = require('../../utils/store');
const layout = require('../../utils/layout');
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share');

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function getMonthValue(year, month) {
  return `${year}-${pad(month)}`;
}

function normalizeMonth(year, month) {
  const date = new Date(year, month - 1, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1
  };
}

Page({
  data: {
    navHeight: 88,
    calendarHeight: 600,
    viewYear: 0,
    viewMonth: 0,
    monthPickerValue: '',
    todayMonthValue: '',
    canNextMonth: false,
    month: {},
    selectedDate: '',
    dayNotes: [],
    activeIndex: -1,
    favoriteEffect: null,
    isCheckedToday: false
  },

  onLoad() {
    const today = new Date();
    const viewYear = today.getFullYear();
    const viewMonth = today.getMonth() + 1;
    this.setData({
      navHeight: layout.getNavMetrics().totalHeight,
      viewYear,
      viewMonth,
      monthPickerValue: getMonthValue(viewYear, viewMonth),
      todayMonthValue: getMonthValue(viewYear, viewMonth)
    }, () => this.updateCalendarHeight());
  },

  onShow() {
    enableShareMenu();
    this.refresh();
    this.updateCalendarHeight();
  },

  onReady() {
    this.updateCalendarHeight();
  },

  onUnload() {
    clearTimeout(this._favoriteEffectTimer);
  },

  updateCalendarHeight() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const calendarHeight = Math.max(360, (info.windowHeight || 667) - this.data.navHeight);
    this.setData({ calendarHeight });
  },

  async refresh() {
    const viewYear = this.data.viewYear || new Date().getFullYear();
    const viewMonth = this.data.viewMonth || new Date().getMonth() + 1;
    const month = await store.getCheckinMonthAsync(viewYear, viewMonth);
    const currentMonthTime = new Date(viewYear, viewMonth - 1, 1).getTime();
    const today = new Date();
    const todayMonthTime = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

    this.setData({
      month,
      isCheckedToday: !!month.isCheckedToday,
      monthPickerValue: getMonthValue(viewYear, viewMonth),
      todayMonthValue: getMonthValue(today.getFullYear(), today.getMonth() + 1),
      canNextMonth: currentMonthTime < todayMonthTime
    });

    if (this.data.selectedDate && this.data.activeIndex >= 0) {
      this.loadDayNotes(this.data.selectedDate);
    }
  },

  setCalendarMonth(year, month) {
    const next = normalizeMonth(year, month);
    this.setData({
      viewYear: next.year,
      viewMonth: next.month,
      selectedDate: '',
      dayNotes: [],
      activeIndex: -1,
      favoriteEffect: null
    }, () => this.refresh());
  },

  goPrevMonth() {
    this.setCalendarMonth(this.data.viewYear, this.data.viewMonth - 1);
  },

  goNextMonth() {
    if (!this.data.canNextMonth) {
      wx.showToast({ title: '还没有下个月的记录', icon: 'none' });
      return;
    }
    this.setCalendarMonth(this.data.viewYear, this.data.viewMonth + 1);
  },

  onMonthChange(event) {
    const value = event.detail.value || this.data.monthPickerValue;
    const parts = value.split('-').map((item) => Number(item));
    if (parts.length < 2 || !parts[0] || !parts[1]) return;
    this.setCalendarMonth(parts[0], parts[1]);
  },

  onDayTap(event) {
    const date = event.currentTarget.dataset.date;
    const checked = event.currentTarget.dataset.checked === true || event.currentTarget.dataset.checked === 'true';
    const future = event.currentTarget.dataset.future === true || event.currentTarget.dataset.future === 'true';
    if (!date) return;

    if (future) {
      wx.showToast({ title: '未来日期还不能打卡', icon: 'none' });
      return;
    }

    if (checked) {
      this.loadDayNotes(date);
      return;
    }

    wx.navigateTo({
      url: `/pages/note-edit/note-edit?checkinDate=${date}`
    });
  },

  async loadDayNotes(date) {
    const notes = await store.getMyNotesByDateAsync(date);
    const dayNotes = notes.map((item) => ({
      ...item,
      favoriteCount: typeof item.favoriteCount === 'number' ? item.favoriteCount : 0,
      favoriteCountText: `${typeof item.favoriteCount === 'number' ? item.favoriteCount : 0}`,
      isFavorite: !!item.isFavorite
    }));

    this.setData({
      selectedDate: date,
      dayNotes,
      activeIndex: dayNotes.length ? 0 : -1,
      favoriteEffect: null
    });
  },

  closeDetail() {
    this.setData({
      activeIndex: -1,
      favoriteEffect: null
    });
  },

  stopTap() {},

  onSwiperChange(event) {
    clearTimeout(this._favoriteEffectTimer);
    this.setData({
      activeIndex: event.detail.current,
      favoriteEffect: null
    });
  },

  async toggleFavorite(event) {
    const index = Number(event.currentTarget.dataset.index);
    const note = this.data.dayNotes[index];
    if (!note) return;

    const result = await store.toggleFavoriteAsync(note._id);
    const next = result.isFavorite;
    const delta = next ? 1 : -1;
    const dayNotes = this.data.dayNotes.map((item, i) => {
      if (i !== index) return item;
      const favoriteCount = Math.max(0, (item.favoriteCount || 0) + delta);
      return {
        ...item,
        isFavorite: next,
        favoriteCount: typeof result.favoriteCount === 'number' ? result.favoriteCount : favoriteCount,
        favoriteCountText: `${typeof result.favoriteCount === 'number' ? result.favoriteCount : favoriteCount}`
      };
    });

    clearTimeout(this._favoriteEffectTimer);
    this.setData({
      dayNotes,
      favoriteEffect: {
        noteId: note._id,
        type: next ? 'plus' : 'minus',
        text: next ? '+1' : '-1'
      }
    });

    this._favoriteEffectTimer = setTimeout(() => {
      this.setData({ favoriteEffect: null });
    }, 1200);
  },

  previewImage(event) {
    const index = event.currentTarget.dataset.index;
    const note = this.data.dayNotes[index];
    if (!note) return;
    wx.previewImage({
      current: event.currentTarget.dataset.src,
      urls: note.images
    });
  },

  onShareAppMessage() {
    return getShareAppMessage();
  },

  onShareTimeline() {
    return getShareTimeline();
  }
});
