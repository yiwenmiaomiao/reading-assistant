const store = require('../../utils/store');
const layout = require('../../utils/layout');
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share');

Page({
  data: {
    navHeight: 88,
    listHeight: 550, // 用于动态锁死 scroll-view 像素高度
    keyword: '',
    notes: [],
    searchTimer: null
  },

  onLoad() {
    const metrics = layout.getNavMetrics();
    this.setData({
      navHeight: metrics.totalHeight
    }, () => this.updateListHeight());
  },

  onShow() {
    enableShareMenu();
    this.setData({
      navHeight: layout.getNavMetrics().totalHeight
    });
    this.loadNotes(); // 触发加载
    this.updateListHeight();
  },

  onReady() {
    this.updateListHeight();
  },

  // 核心数据查询与挂载（修复：重新补回此核心方法）
  async loadNotes() {
    this.setData({
      notes: await store.searchMyNotesAsync(this.data.keyword)
    });
  },

  // 精确计算动态剩余高度，防止全面屏底部大片空白或截断
  updateListHeight() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const windowHeight = info.windowHeight;
    
    this.createSelectorQuery()
      .select('.my-search')
      .boundingClientRect((res) => {
        let searchHeight = 0;
        if (res) {
          searchHeight = res.height;
        }
        // 动态剔除状态栏、导航栏、搜索框的高度
        const listHeight = windowHeight - this.data.navHeight - searchHeight;
        this.setData({
          listHeight: listHeight > 0 ? listHeight : 550
        });
      })
      .exec();
  },

  onKeywordInput(event) {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }
    this.setData({ keyword: event.detail.value });
    const searchTimer = setTimeout(() => {
      this.loadNotes();
    }, 180);
    this.setData({ searchTimer });
  },

  onUnload() {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }
  },

  editNote(event) {
    wx.navigateTo({
      url: `/pages/note-edit/note-edit?id=${event.currentTarget.dataset.id}`
    });
  },

  deleteNote(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除笔记',
      content: '删除后会同步刷新首页和个人统计，确定删除吗？',
      success: async (res) => {
        if (res.confirm) {
          await store.deleteNoteAsync(id);
          this.loadNotes();
        }
      }
    });
  }
});
