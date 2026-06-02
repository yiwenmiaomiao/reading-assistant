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

  async loadUsers() {
    const selected = this.data.selectedUserIds;
    const users = await store.getUsersAsync();
    const userIds = users.map((user) => user._openid);
    const validSelected = selected.filter((id) => userIds.includes(id));
    if (validSelected.length !== selected.length) {
      this.setData({ selectedUserIds: validSelected });
    }
    this.setData({
      users: users.map((user) => ({
        ...user,
        checked: validSelected.includes(user._openid)
      }))
    });
  },

  async loadNotes(reset) {
    const page = reset ? 1 : this.data.page;
    const result = await store.searchAllNotesAsync({
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
    const selectedDate = event.detail.value;
    
    // 校验：开始日期不能晚于结束日期
    if (this.data.endDate && selectedDate > this.data.endDate) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' });
      return;
    }

    this.setData({ startDate: selectedDate });
    this.loadNotes(true);
  },

  onEndDateChange(event) {
    const selectedDate = event.detail.value;

    // 校验：结束日期不能早于开始日期
    if (this.data.startDate && selectedDate < this.data.startDate) {
      wx.showToast({ title: '结束日期不能早于开始日期', icon: 'none' });
      return;
    }

    this.setData({ endDate: selectedDate });
    this.loadNotes(true);
  },

  clearStartDate() {
    this.setData({ startDate: '' });
    this.loadNotes(true);
  },

  clearEndDate() {
    this.setData({ endDate: '' });
    this.loadNotes(true);
  },

  resetFilters() {
    this.setData({
      keyword: '',
      startDate: '',
      endDate: '',
      selectedUserIds: [],
      // 重置用户列表的勾选状态
      users: this.data.users.map((user) => ({ ...user, checked: false })),
      showUserPanel: false
    }, () => {
      // 状态清理完毕后，重新加载列表并重算高度
      this.loadNotes(true);
      this.updateListHeight();
    });
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

  async toggleFavorite(event) {
    const index = Number(event.currentTarget.dataset.index);
    const note = this.data.notes[index];
    if (!note) return;
    const result = await store.toggleFavoriteAsync(note._id);
    const next = result.isFavorite;
    const delta = next ? 1 : -1;
    const notes = this.data.notes.map((item, i) => i === index
      ? {
          ...item,
          isFavorite: next,
          favoriteCount: typeof result.favoriteCount === 'number' ? result.favoriteCount : Math.max(0, (item.favoriteCount || 0) + delta),
          favoriteCountText: `${typeof result.favoriteCount === 'number' ? result.favoriteCount : Math.max(0, (item.favoriteCount || 0) + delta)}`
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
