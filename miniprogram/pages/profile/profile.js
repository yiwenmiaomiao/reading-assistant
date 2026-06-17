const store = require('../../utils/store');
const layout = require('../../utils/layout');
const { syncTabBar } = require('../../utils/tabbar');
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share');

Page({
  data: {
    pageHeight: 680,
    user: {},
    stats: {},
    pendingAvatar: ''
  },

  onLoad() {
    this.updatePageHeight();
  },

  async onShow() {
    this.updatePageHeight();

    // --- 【关键修改】进入即拦截 ---
    const app = getApp();
    if (app.hasCompletedProfile && !app.hasCompletedProfile()) {
      // 唤起组件弹窗，并中断后续渲染
      const gate = this.selectComponent('#profileGate');
      console.log('测试能否找到弹窗组件：', gate);
      if (gate) gate.show();
      return; 
    }

    const user = await store.currentUserAsync();
    const stats = await store.getMyStatsAsync();
    enableShareMenu();
    this.setData({
      user: this.formatUser(user),
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
    // 使用你顶部引入的 layout 工具获取导航栏高度
    const metrics = layout.getNavMetrics ? layout.getNavMetrics() : { totalHeight: 0 };
    
    this.setData({
      pageHeight: (info.windowHeight || 667) - (metrics.totalHeight || 0)
    });
  },

  formatUser(user) {
    const nickname = user && user.nickname ? user.nickname : '读者';
    return {
      ...user,
      nickname,
      avatar: user && user.avatar ? user.avatar : '',
      hasAvatar: !!(user && user.avatar),
      avatarText: nickname.slice(0, 1)
    };
  },

  onAvatarChoose(event) {
    const avatarUrl = event.detail.avatarUrl || '';
    if (!avatarUrl) return;
    this.saveWechatProfile({
      avatar: avatarUrl,
      nickname: this.data.user.nickname,
      toast: '头像已更新'
    });
  },

  onNicknameInput(event) {
    this.setData({
      user: {
        ...this.data.user,
        nickname: event.detail.value
      }
    });
  },

  onNicknameBlur() {
    this.saveWechatProfile({
      nickname: this.data.user.nickname,
      avatar: this.data.user.avatar,
      toast: '昵称已更新'
    });
  },

  async saveWechatProfile(options = {}) {
    const nickname = `${options.nickname || ''}`.trim();
    const avatar = options.avatar || '';

    if (!nickname && !avatar) {
      return;
    }

    const user = await store.updateCurrentUserProfileAsync({
      nickname,
      avatar
    });
    const app = getApp();
    if (app.markProfileCompleted) {
      app.markProfileCompleted();
    }

    this.setData({
      user: this.formatUser(user),
      pendingAvatar: ''
    });
    if (options.toast) {
      wx.showToast({ title: options.toast, icon: 'success' });
    }
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
