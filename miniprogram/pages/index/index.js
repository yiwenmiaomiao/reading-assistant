const store = require('../../utils/store');
const layout = require('../../utils/layout');
const { syncTabBar } = require('../../utils/tabbar');
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share');

Page({
  data: {
    pageHeight: 680,
    showProfileGate: false,
    profileLoggingIn: true,
    profileNickname: '',
    profileAvatar: '',
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
    this.ensureProfileGate();
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

  ensureProfileGate() {
    const app = getApp();
    if (app.hasCompletedProfile && app.hasCompletedProfile()) {
      this.setData({ showProfileGate: false });
      return;
    }

    this.setData({
      showProfileGate: true,
      profileLoggingIn: true
    });

    const cachedOpenid = wx.getStorageSync('openid');
    if (cachedOpenid) {
      app.globalData.currentUserId = cachedOpenid;
      store.migrateNickname();
      this.loadGateProfile();
      return;
    }

    wx.login({
      success: (loginRes) => {
        wx.cloud.callFunction({
          name: 'getOpenId',
          data: { code: loginRes.code },
          success: (res) => {
            const openid = res.result.openid;
            wx.setStorageSync('openid', openid);
            app.globalData.currentUserId = openid;
            store.migrateNickname();
            this.loadGateProfile();
          },
          fail: () => {
            this.setData({ profileLoggingIn: false });
            wx.showToast({ title: '登录失败，请重试', icon: 'none' });
          }
        });
      },
      fail: () => {
        this.setData({ profileLoggingIn: false });
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      }
    });
  },

  async loadGateProfile() {
    await store.currentUserAsync();
    this.setData({
      profileLoggingIn: false,
      profileNickname: '',
      profileAvatar: ''
    });
  },

  onGateAvatarChoose(event) {
    this.setData({
      profileAvatar: event.detail.avatarUrl || this.data.profileAvatar
    });
  },

  onGateNicknameInput(event) {
    const nickname = event.detail.value || '';
    this.setData({
      profileNickname: nickname
    });
  },

  completeProfileGate() {
    const nickname = `${this.data.profileNickname || ''}`.trim();
    const avatar = this.data.profileAvatar || '';

    if (!nickname) {
      wx.showToast({ title: '请填写微信昵称', icon: 'none' });
      return;
    }
    if (!avatar) {
      wx.showToast({ title: '请选择微信头像', icon: 'none' });
      return;
    }

    store.updateCurrentUserProfileAsync({ nickname, avatar }).then(() => {
      this.refresh();
    });
    const app = getApp();
    if (app.markProfileCompleted) {
      app.markProfileCompleted();
    }
    this.setData({ showProfileGate: false });
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
