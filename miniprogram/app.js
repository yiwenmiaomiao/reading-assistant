const store = require('./utils/store');

const PROFILE_COMPLETED_KEY = 'wechat_profile_completed';

App({
  onLaunch() {
    if (!wx.cloud) return;
    wx.cloud.init({ traceUser: true });

    store.ensureSeed();
    console.log('seed data exists:', wx.getStorageSync('reading_notes_mvp_state_v1'));

    // 静默登录：拿缓存 openid，没有就走 wx.login 换取
    const cachedOpenid = wx.getStorageSync('openid');
    if (cachedOpenid) {
      this.globalData.currentUserId = cachedOpenid;
      store.migrateNickname();
      this._migrateLocalDataToCloud().then(() => this._notifyCurrentPage());
    } else {
      this._silentLogin();
    }
  },

  _silentLogin() {
    wx.login({
      success: (loginRes) => {
        wx.cloud.callFunction({
          name: 'getOpenId',
          data: { code: loginRes.code },
          success: (res) => {
            const openid = res.result.openid;
            wx.setStorageSync('openid', openid);
            this.globalData.currentUserId = openid;
            store.migrateNickname(); 
            this._migrateLocalDataToCloud().then(() => this._notifyCurrentPage());
          },
        });
      }
    });
  },

  _migrateLocalDataToCloud() {
    return store.migrateLocalDataToCloudAsync().then((res) => {
      if (res && res.migrated) {
        console.log('local data migrated to cloud:', res);
      }
      return res;
    });
  },

  _notifyCurrentPage() {
    const pages = getCurrentPages();
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1];
      if (currentPage.onShow) currentPage.onShow();
    }
  },

  hasCompletedProfile() {
    return !!wx.getStorageSync(PROFILE_COMPLETED_KEY);
  },

  markProfileCompleted() {
    wx.setStorageSync(PROFILE_COMPLETED_KEY, true);
  },

  globalData: {
    currentUserId: '',
    profileCompletedKey: PROFILE_COMPLETED_KEY
  }
});
