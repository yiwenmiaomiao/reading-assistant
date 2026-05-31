const store = require('../../utils/store');
const layout = require('../../utils/layout');
const { syncTabBar } = require('../../utils/tabbar');
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share');

Page({
  data: {
    navHeight: 88,
    windowWidth: 375,
    listHeight: 520,
    keyword: '',
    startDate: '',
    endDate: '',
    users: [],
    selectedUserIds: [],
    showUserPanel: false,
    notes: [],
    page: 1,
    hasMore: false,
    activeIndex: -1,
    favoriteEffect: null,
    searchTimer: null
  },

  onLoad() {
    const metrics = layout.getNavMetrics();
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      navHeight: metrics.totalHeight,
      windowWidth: info.windowWidth || 375
    }, () => this.updateListHeight());
  },

  onShow() {
    this.loadUsers();
    this.loadNotes(true);
    this.updateListHeight();
    enableShareMenu();
    syncTabBar(this, 1);
  },

  onReady() {
    this.updateListHeight();
  },

  onUnload() {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }
    clearTimeout(this._favoriteEffectTimer);
  },

  updateListHeight() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const query = this.createSelectorQuery();
    query.select('.filter-bar').boundingClientRect();
    query.exec((rects) => {
      const filterBottom = rects && rects[0] ? rects[0].bottom : this.data.navHeight + 190;
      const bottomGap = 16;
      const listHeight = Math.max(260, (info.windowHeight || 667) - filterBottom - bottomGap);
      this.setData({ listHeight });
    });
  },

  loadUsers() {
    const selected = this.data.selectedUserIds;
    this.setData({
      users: store.getUsers().map((user) => ({
        ...user,
        checked: selected.includes(user._openid)
      }))
    });
  },

  loadNotes(reset) {
    const page = reset ? 1 : this.data.page;
    const result = store.searchAllNotes({
      keyword: this.data.keyword,
      startDate: this.data.startDate,
      endDate: this.data.endDate,
      userIds: this.data.selectedUserIds,
      page
    });

    const formattedList = result.list.map((item) => ({
      ...item,
      favoriteCount: typeof item.favoriteCount === 'number' ? item.favoriteCount : 0,
      favoriteCountText: `${typeof item.favoriteCount === 'number' ? item.favoriteCount : 0}`,
      isFavorite: !!item.isFavorite 
    }));

    this.setData({
      notes: reset ? formattedList : this.data.notes.concat(formattedList),
      page: page + 1,
      hasMore: result.hasMore
    });
  },

  onKeywordInput(event) {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }
    this.setData({ keyword: event.detail.value });
    const searchTimer = setTimeout(() => {
      this.loadNotes(true);
      this.updateListHeight();
    }, 180);
    this.setData({ searchTimer });
  },

  onStartDateChange(event) {
    this.setData({ startDate: event.detail.value });
    this.loadNotes(true);
  },

  onEndDateChange(event) {
    this.setData({ endDate: event.detail.value });
    this.loadNotes(true);
  },

  toggleUserPanel() {
    this.setData({
      showUserPanel: !this.data.showUserPanel
    }, () => this.updateListHeight());
  },

  onUserChange(event) {
    const selected = event.detail.value;
    this.setData({
      selectedUserIds: selected,
      users: this.data.users.map((user) => ({
        ...user,
        checked: selected.includes(user._openid)
      }))
    });
    this.loadNotes(true);
  },

  loadMore() {
    if (this.data.hasMore) {
      this.loadNotes(false);
    }
  },

  onReachBottom() {
    this.loadMore();
  },

  // 打开详情卡片视图
  openDetail(event) {
    const activeIndex = Number(event.currentTarget.dataset.index);
    this.setData({ activeIndex });
  },

  // 关闭详情卡片视图
    closeDetail() {
    this.setData({
      activeIndex: -1,
      favoriteEffect: null
    });
  },

  stopTap() {}, // 阻止事件冒泡到 mask

  // 监听 Swiper 滑动切换
  onSwiperChange(event) {
    clearTimeout(this._favoriteEffectTimer);
    this.setData({
      activeIndex: event.detail.current,
      favoriteEffect: null
    });
  },

  toggleFavorite(event) {
    const index = Number(event.currentTarget.dataset.index);
    const note = this.data.notes[index];
    if (!note) return;
    const next = store.toggleFavorite(note._id);
    const delta = next ? 1 : -1;
    const notes = this.data.notes.map((item, i) => i === index
      ? {
          ...item,
          isFavorite: next,
          favoriteCount: Math.max(0, (item.favoriteCount || 0) + delta),
          favoriteCountText: `${Math.max(0, (item.favoriteCount || 0) + delta)}`
        }
      : item);

    clearTimeout(this._favoriteEffectTimer);
    this.setData({
      notes,
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
    const note = this.data.notes[index];
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
