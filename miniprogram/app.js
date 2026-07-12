const store = require('./utils/store');

const PROFILE_COMPLETED_KEY = 'wechat_profile_completed';

App({
  onLaunch() {
    if (!wx.cloud) return;
    wx.cloud.init({ traceUser: true });

    store.ensureSeed();

    // 静默登录：拿缓存 openid，没有就走 wx.login 换取
    const cachedOpenid = wx.getStorageSync('openid');
    if (cachedOpenid) {
      this.globalData.currentUserId = cachedOpenid;
      store.migrateNickname();
      this._migrateLocalDataToCloud();
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
            this._migrateLocalDataToCloud();
          },
        });
      }
    });
  },

  _migrateLocalDataToCloud() {
    return store.migrateLocalDataToCloudAsync().then((res) => {
      if (res && res.migrated) {
        this.globalData.dataMigrated = true;
      }
      return res;
    });
  },

  hasCompletedProfile() {
    return !!wx.getStorageSync(PROFILE_COMPLETED_KEY);
  },

  markProfileCompleted() {
    wx.setStorageSync(PROFILE_COMPLETED_KEY, true);
  },

  globalData: {
    currentUserId: '',
    profileCompletedKey: PROFILE_COMPLETED_KEY,
    dataMigrated: false,
    lastFetchTime: {}  // 记录各页面最后请求时间，用于节流
  }
});
