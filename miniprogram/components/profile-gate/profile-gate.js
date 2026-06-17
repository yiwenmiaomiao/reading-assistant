const store = require('../../utils/store'); // 根据你的目录层级调整相对路径

Component({
  data: {
    showProfileGate: false,
    profileLoggingIn: true,
    profileNickname: '',
    profileAvatar: '',
    profileGateReady: false
  },

  methods: {
    // 供外部页面调用的显示方法
    show(callback) {
      // 把传入的下一步动作存起来
      this.successCallback = callback;
      this.setData({
        showProfileGate: true,
        profileLoggingIn: true,
        profileGateReady: false
      });
      this._doLogin();
    },

    // 内部登录逻辑
    _doLogin() {
      const app = getApp();
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
        profileAvatar: '',
        profileGateReady: false
      });
    },

    stopTap() {
      return;
    },

    // 【新增】点击外部蒙层的关闭逻辑
    closeGate() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];

      // ====== 【新增鉴权拦截】 ======
      // 如果当前页面是“我的”页面（profile），则拦截关闭动作
      if (currentPage && currentPage.route.includes('profile/profile')) {
        // 可选：给用户一个轻提示，告诉他为什么关不掉
        wx.showToast({
          title: '该页面需登录后查看',
          icon: 'none'
        });
        return; // 直接 return，阻断执行，弹窗就不会关了
      }
      // ============================

      // 1. 隐藏弹窗 (非 profile 页面才会执行到这里)
      this.setData({ showProfileGate: false });
      
      // 2. 清空之前存下来的跳转动作（防止下次点开乱跳）
      this.successCallback = null; 

      // 3. 智能判断：如果当前是在二级页面（如 note-edit），关闭弹窗的同时返回上一页
      if (pages.length > 1 && currentPage.route.includes('note-edit')) {
        wx.navigateBack();
      }
    },

    onGateAvatarChoose(event) {
      const profileAvatar = event.detail.avatarUrl || this.data.profileAvatar;
      this.setData({
        profileAvatar,
        profileGateReady: this.canCompleteProfileGate(this.data.profileNickname, profileAvatar)
      });
    },

    onGateNicknameInput(event) {
      const nickname = event.detail.value || '';
      this.setData({
        profileNickname: nickname,
        profileGateReady: this.canCompleteProfileGate(nickname, this.data.profileAvatar)
      });
    },

    canCompleteProfileGate(nickname, avatar) {
      return !!(`${nickname || ''}`.trim() && avatar);
    },

    completeProfileGate() {
      const nickname = `${this.data.profileNickname || ''}`.trim();
      const avatar = this.data.profileAvatar || '';

      if (!this.canCompleteProfileGate(nickname, avatar) || this.data.profileLoggingIn) return;

      if (!nickname) return wx.showToast({ title: '请填写微信昵称', icon: 'none' });
      if (!avatar) return wx.showToast({ title: '请选择微信头像', icon: 'none' });

      store.updateCurrentUserProfileAsync({ nickname, avatar }).then(() => {
        const app = getApp();
        if (app.markProfileCompleted) app.markProfileCompleted();
        
        // 关闭弹窗
        this.setData({ showProfileGate: false });
        this.triggerEvent('success');
        
        // --- 【新增这里】执行记忆的下一步动作 ---
        if (typeof this.successCallback === 'function') {
          this.successCallback();      // 执行跳转等动作
          this.successCallback = null; // 执行完后清空记忆，避免污染下次操作
        }
      });
    }

  }
});