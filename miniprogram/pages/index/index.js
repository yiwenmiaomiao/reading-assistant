const store = require('../../utils/store');
const layout = require('../../utils/layout');
const { syncTabBar } = require('../../utils/tabbar');
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share');

Page({
  data: {
    pageHeight: 680,
    stats: {
      todayCount: 0,
      weekCount: 0,
      topThree: []
    }
  },

  onLoad() {
    this.updatePageHeight();
  },

  onShow() {
    this.updatePageHeight();
    this.refresh();
    enableShareMenu();
    syncTabBar(this, 0);
  },

  updatePageHeight() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const navHeight = layout.getNavMetrics().totalHeight;
    this.setData({
      pageHeight: Math.max(420, (info.windowHeight || 667) - navHeight)
    });
  },

  async refresh() {
    const stats = await store.getPlatformStatsAsync();
    this.setData({
      stats: {
        ...stats,
        topThree: stats.topThree.map((item) => ({
          ...item,
          readingScoreDisplay: item.readingScoreDisplay || `${item.readingScoreText || item.readingScore || 0} 分`
        }))
      }
    });
  },

  goRanking() {
    wx.navigateTo({
      url: '/pages/ranking/ranking'
    });
  },

  onShareAppMessage() {
    return getShareAppMessage();
  },

  onShareTimeline() {
    return getShareTimeline();
  }
});
