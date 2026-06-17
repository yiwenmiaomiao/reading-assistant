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

当前数据层已经改为云开发优先：页面通过 `miniprogram/utils/store.js` 调用云函数读写共享数据，云函数不可用时才回退到本地 `wx.setStorageSync` 模拟数据，便于开发调试。

## 云数据库集合

共享阅读主集合：

- `users`：用户公开资料、头像昵称、统计摘要。
- `notes`：所有用户发布的共享笔记，包含 `_openid`、`bookId`、`bookTitle`、`content`、`reflection`、`tags`、`images`、`visibility`、`favoriteCount`、`readingScore`、`checkinDate`。
- `favorites`：兼容当前收藏笔记页面的一用户一笔记收藏关系。
- `tags`：全局标签池和使用次数。
- `weekly_rankings`：周榜归档。

为后续读书功能预留：

- `books`：书籍基础信息和全站评分统计。
- `user_books`：用户自己的书籍阅读状态、评分、私有记录。
- `reading_logs`：阅读进度、页码、时长和记录。
- `favorite_folders`：用户收藏夹。
- `favorite_items`：收藏夹条目，支持收藏 `note` 或 `book`。
- `note_reads`：后续阅读行为统计预留。

建议索引：

- `notes`: `visibility + isDeleted + createdAt`
- `notes`: `_openid + isDeleted + createdAt`
- `notes`: `_openid + checkinDate`
- `favorites`: `_openid + noteId`
- `favorites`: `noteId`
- `favorite_items`: `_openid + folderId + targetType`
- `books`: `title`
- `user_books`: `_openid + bookId`
- `reading_logs`: `_openid + bookId + loggedAt`
- `weekly_rankings`: `weekStart`

首次接入云环境后，先部署并执行 `cloudfunctions/initDatabase` 创建集合，再部署其余云函数。

如果之前已经在本地 mock 数据里写过笔记，首次拿到真实 `openid` 后，小程序会调用 `importLocalData` 把本地当前用户历史笔记导入云端。导入依据 `importedLocalId` 去重，同一份本地历史数据不会重复导入。

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
  initDatabase/
  diagnoseCloudData/
  cleanupNoteAuthorFields/
  importLocalData/
  getCurrentUser/
  upsertUserProfile/
  getUsers/
  createNote/
  updateNote/
  deleteNote/
  getNote/
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
