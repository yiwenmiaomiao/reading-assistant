const store = require('../../utils/store');
const layout = require('../../utils/layout');
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share');

Page({
  data: {
    pageHeight: 680,
    stats: {}
  },

  onLoad() {
    this.updatePageHeight();
  },

  async onShow() {
    enableShareMenu();
    this.updatePageHeight();
    this.setData({
      stats: await store.getMyStatsAsync()
    });
  },

  updatePageHeight() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const navHeight = layout.getNavMetrics().totalHeight;
    this.setData({
      pageHeight: Math.max(420, (info.windowHeight || 667) - navHeight)
    });
  },

  onShareAppMessage() {
    return getShareAppMessage();
  },

  onShareTimeline() {
    return getShareTimeline();
  }
});
