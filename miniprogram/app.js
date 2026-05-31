const store = require('./utils/store');

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

            // 通知所有页面重新加载
            const pages = getCurrentPages();
            if (pages.length > 0) {
              const currentPage = pages[pages.length - 1];
              if (currentPage.onShow) currentPage.onShow();
            }
          },
        });
      }
    });
  },

  globalData: {
    currentUserId: ''
  }
});
