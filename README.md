# 读书笔记微信小程序 MVP

这是根据 `读书笔记小程序-需求文档.md` 搭建的原生微信小程序 MVP。项目采用微信小程序标准结构：全局 `app.json/app.js/app.wxss`，页面级 `json/js/wxml/wxss`，并预留微信云开发云函数目录。

## 已实现

- 三 Tab：首页 / 笔记 / 我的
- 首页全平台今日新增、本周新增、本周排名与 TOP 20 排名页
- 全平台笔记列表：关键词、日期范围、多用户筛选、分页加载
- 笔记详情浮层：毛玻璃背景、纵向滑动切换、收藏/取消收藏
- 新增 / 编辑 / 软删除我的笔记
- 全局标签复用与自定义标签创建
- 图片选择：最多 9 张，单张 10MB 校验
- 个人中心：总笔记、书籍数、周排名、连续打卡
- 我的笔记、收藏笔记、我的成就、阅读统计页面

## 运行方式

1. 打开微信开发者工具。
2. 导入本目录，项目根目录选择 `/Users/xiaoxianhan/Documents/读书笔记`。
3. AppID 可先使用测试号或游客模式。
4. 小程序根目录为 `miniprogram/`，云函数根目录为 `cloudfunctions/`。

当前 MVP 使用 `wx.setStorageSync` 做本地数据仓库，便于先完整体验前端流程。接入真实云开发时，可将 `miniprogram/utils/store.js` 中的数据读写替换为 `wx.cloud.callFunction`，云函数骨架已经按 PRD 清单放在 `cloudfunctions/`。

## 主要目录

```text
miniprogram/
  app.json
  pages/
    index/
    notes/
    profile/
    ranking/
    my-notes/
    note-edit/
    favorites/
    achievements/
    reading-stats/
  utils/
    store.js
    date.js
cloudfunctions/
  calcWeeklyRank/
  updateUserStats/
  getPlatformStats/
  searchAllNotes/
  searchMyNotes/
  toggleFavorite/
  getFavorites/
  getTags/
  createTag/
```

## 页面路径与返回

| 页面 | 路径 | 返回方式 |
| --- | --- | --- |
| 首页 | `/pages/index/index` | Tab 页面，不显示返回 |
| 笔记 | `/pages/notes/notes` | Tab 页面，不显示返回 |
| 我的 | `/pages/profile/profile` | Tab 页面，不显示返回 |
| 本周排名 | `/pages/ranking/ranking` | 顶部返回按钮 / iOS 右滑返回 |
| 我的笔记 | `/pages/my-notes/my-notes` | 顶部返回按钮 / iOS 右滑返回 |
| 写/编辑笔记 | `/pages/note-edit/note-edit` | 顶部返回按钮 / iOS 右滑返回 |
| 收藏笔记 | `/pages/favorites/favorites` | 顶部返回按钮 / iOS 右滑返回 |
| 我的成就 | `/pages/achievements/achievements` | 顶部返回按钮 / iOS 右滑返回 |
| 阅读统计 | `/pages/reading-stats/reading-stats` | 顶部返回按钮 / iOS 右滑返回 |

自定义导航栏会读取 `wx.getWindowInfo()` 与微信胶囊按钮位置，动态适配 iPhone 14 Pro 等刘海屏安全区。
