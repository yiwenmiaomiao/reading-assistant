const store = require('../../utils/store');
const layout = require('../../utils/layout');
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share');

Page({
  data: {
    pageHeight: 680,
    notes: []
  },

  onLoad() {
    this.updatePageHeight();
  },

  onShow() {
    enableShareMenu();
    this.updatePageHeight();
    this.loadFavorites();
  },

  updatePageHeight() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const navHeight = layout.getNavMetrics().totalHeight;
    this.setData({
      pageHeight: Math.max(420, (info.windowHeight || 667) - navHeight)
    });
  },

  loadFavorites() {
    this.setData({
      notes: store.getFavorites()
    });
  },

  unfavorite(event) {
    store.toggleFavorite(event.currentTarget.dataset.id);
    this.loadFavorites();
  },

  onShareAppMessage() {
    return getShareAppMessage();
  },

  onShareTimeline() {
    return getShareTimeline();
  }
});
