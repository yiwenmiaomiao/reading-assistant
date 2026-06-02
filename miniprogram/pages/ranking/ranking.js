const store = require('../../utils/store');
const layout = require('../../utils/layout');
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share');

Page({
  data: {
    pageHeight: 680,
    rankings: []
  },

  onLoad() {
    this.updatePageHeight();
  },

  async onShow() {
    enableShareMenu();
    this.updatePageHeight();
    const rankings = (await store.getPlatformStatsAsync()).rankings.slice(0, 20);
    this.setData({
      rankings: rankings.map((item) => ({
        ...item,
        readingScoreDisplay: item.readingScoreDisplay || `${item.readingScoreText || item.readingScore || 0} 分`
      }))
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
