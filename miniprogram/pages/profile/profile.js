const store = require('../../utils/store');
const layout = require('../../utils/layout');
const { syncTabBar } = require('../../utils/tabbar');
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share');

Page({
  data: {
    pageHeight: 680,
    user: {},
    stats: {}
  },

  onLoad() {
    this.updatePageHeight();
  },

  onShow() {
    this.updatePageHeight();
    const user = store.currentUser();
    const stats = store.getMyStats();
    enableShareMenu();
    this.setData({
      user: {
        ...user,
        avatarText: user.nickname ? user.nickname.slice(0, 1) : '我'
      },
      stats: {
        ...stats,
        weekReadingScoreDisplay: stats.weekReadingScoreDisplay || `${stats.weekReadingScore || 0}`,
        totalReadingScoreDisplay: stats.totalReadingScoreDisplay || `${stats.totalReadingScore || 0}`
      }
    });
    syncTabBar(this, 2);
  },

  updatePageHeight() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const navHeight = layout.getNavMetrics().totalHeight;
    this.setData({
      pageHeight: Math.max(420, (info.windowHeight || 667) - navHeight)
    });
  },

  goMyNotes() {
    wx.navigateTo({ url: '/pages/my-notes/my-notes' });
  },

  goCheckins() {
    wx.navigateTo({ url: '/pages/checkins/checkins' });
  },

  goAchievements() {
    wx.navigateTo({ url: '/pages/achievements/achievements' });
  },

  goReadingStats() {
    wx.navigateTo({ url: '/pages/reading-stats/reading-stats' });
  },

  goFavorites() {
    wx.navigateTo({ url: '/pages/favorites/favorites' });
  },

  onShareAppMessage() {
    return getShareAppMessage();
  },

  onShareTimeline() {
    return getShareTimeline();
  }
});
