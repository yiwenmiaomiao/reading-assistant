const store = require('../../utils/store');
const layout = require('../../utils/layout');
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share');

Page({
  data: {
    pageHeight: 680,
    achievementYears: [] // 用于存放年份和月份的数据结构
  },

  onLoad() {
    this.updatePageHeight();
  },

  async onShow() {
    enableShareMenu();
    this.updatePageHeight();
    this.loadAchievements();
  },

  updatePageHeight() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const navHeight = layout.getNavMetrics().totalHeight;
    this.setData({
      pageHeight: Math.max(420, (info.windowHeight || 667) - navHeight)
    });
  },

  async loadAchievements() {
    // 1. 获取当前用户信息，拿到自己的 openid
    const currentUser = await store.currentUserAsync();
    const myOpenid = currentUser._openid;

    // 2. 获取全站笔记
    const allNotesRes = await store.searchAllNotesAsync({ pageSize: 5000 });
    const allNotes = allNotesRes.list || [];

    // 3. 构建数据字典：按 "YYYY-MM" 分组计算分数
    const monthlyScores = {}; 

    allNotes.forEach((note) => {
      if (note.isDeleted) return;

      const date = new Date(note.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month}`;
      const openid = note._openid || (note.user && note.user._openid);

      if (!openid) return;

      const excerptScore = `${note.content || ''}`.trim() ? 1 : 0;
      const reflection = `${note.reflection || ''}`.trim();
      const reflectionScore = reflection.length > 20 ? 1.5 : 0;
      const score = excerptScore + reflectionScore;

      if (!monthlyScores[monthKey]) {
        monthlyScores[monthKey] = {};
      }
      if (!monthlyScores[monthKey][openid]) {
        monthlyScores[monthKey][openid] = 0;
      }
      monthlyScores[monthKey][openid] += score;
    });

    // === 新增：获取当前真实时间 ===
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 4. 生成 2026 年 5 月到 12 月的成就数据
    const months2026 = [];
    for (let i = 5; i <= 12; i++) {
      const targetYear = 2026;
      const targetMonth = i;
      const monthKey = `${targetYear}-${targetMonth}`;
      
      let isChampion = false;

      // === 核心校验：只有已结束的月份才允许结算冠军 ===
      // 判断条件：目标年份小于今年，或者同年但目标月份小于当月
      if (targetYear < currentYear || (targetYear === currentYear && targetMonth < currentMonth)) {
        
        const userScores = monthlyScores[monthKey] || {};
        let maxScore = 0;
        let championOpenid = null;

        Object.keys(userScores).forEach((openid) => {
          if (userScores[openid] > maxScore) {
            maxScore = userScores[openid];
            championOpenid = openid;
          }
        });

        // 如果是过去的月份，且自己是最高分，则解锁成就
        isChampion = maxScore > 0 && championOpenid === myOpenid;
      }

      months2026.push({
        month: targetMonth,
        isChampion
      });
    }

    // 5. 更新页面渲染
    this.setData({
      achievementYears: [
        {
          year: 2026,
          months: months2026
        }
      ]
    });
  },

  onShareAppMessage() {
    return getShareAppMessage();
  },

  onShareTimeline() {
    return getShareTimeline();
  }
});