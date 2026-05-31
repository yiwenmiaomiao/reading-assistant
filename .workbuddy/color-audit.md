# 小程序全页面元素颜色清单

> 颜色均以 RGB 表示，格式为 `rgb(R, G, B)` 或 `rgba(R, G, B, A)`。

---

## 1. 全局组件 — app-nav（导航栏）

| 元素内容 | CSS 选择器 | 颜色 | RGB 值 |
|---------|-----------|------|--------|
| 导航栏标题文字 | `.nav-title` | `#10131f` | `rgb(16, 19, 31)` |
| 导航栏背景 | `.app-nav` | `rgba(247, 248, 252, 0.86)` | `rgba(247, 248, 252, 0.86)` |
| 导航栏透明态背景 | `.nav-transparent` | `rgba(247, 248, 252, 0.62)` | `rgba(247, 248, 252, 0.62)` |
| 导航栏底部边线 | `.app-nav` border-bottom | `rgba(226, 232, 240, 0.82)` | `rgba(226, 232, 240, 0.82)` |
| 返回箭头文字 | `.nav-back` | `#10131f` | `rgb(16, 19, 31)` |
| 返回按钮圆形背景 | `.back-icon` | `rgba(255, 255, 255, 0.74)` | `rgba(255, 255, 255, 0.74)` |
| 返回按钮内阴影 | `.back-icon` box-shadow(inset) | `rgba(15, 23, 42, 0.08)` | `rgba(15, 23, 42, 0.08)` |
| 返回按钮外阴影 | `.back-icon` box-shadow | `rgba(15, 23, 42, 0.08)` | `rgba(15, 23, 42, 0.08)` |

---

## 2. 全局通用样式（app.wxss）

| 元素内容 | CSS 选择器 | 颜色 | RGB 值 |
|---------|-----------|------|--------|
| 页面默认文字 | `page` | `#10131f` | `rgb(16, 19, 31)` |
| 页面默认背景 | `page` | `#f6f7fb` | `rgb(246, 247, 251)` |
| 卡片背景 | `.card` | `rgba(255, 255, 255, 0.78)` | `rgba(255, 255, 255, 0.78)` |
| 卡片边框 | `.card` border | `rgba(255, 255, 255, 0.86)` | `rgba(255, 255, 255, 0.86)` |
| 卡片阴影 | `.card` box-shadow | `rgba(15, 23, 42, 0.08)` | `rgba(15, 23, 42, 0.08)` |
| 卡片内阴影 | `.card` box-shadow(inset) | `rgba(15, 23, 42, 0.035)` | `rgba(15, 23, 42, 0.035)` |
| `.page` 背景渐变光晕1 | `.page` | `rgba(87, 141, 255, 0.16)` | `rgba(87, 141, 255, 0.16)` |
| `.page` 背景渐变光晕2 | `.page` | `rgba(255, 92, 129, 0.1)` | `rgba(255, 92, 129, 0.1)` |
| 板块标题 | `.section-title` | `#10131f` | `rgb(16, 19, 31)` |
| 次要文字 | `.muted` | `#6b7280` | `rgb(107, 114, 128)` |
| 主按钮文字 | `.primary-btn` color | `#ffffff` | `rgb(255, 255, 255)` |
| 主按钮渐变起始 | `.primary-btn` background | `#3d7df0` | `rgb(61, 125, 240)` |
| 主按钮渐变终止 | `.primary-btn` background | `#7a5cff` | `rgb(122, 92, 255)` |
| 主按钮阴影 | `.primary-btn` box-shadow | `rgba(61, 125, 240, 0.2)` | `rgba(61, 125, 240, 0.2)` |
| 幽灵按钮文字 | `.ghost-btn` color | `#245ecb` | `rgb(36, 94, 203)` |
| 幽灵按钮背景 | `.ghost-btn` background | `rgba(255, 255, 255, 0.72)` | `rgba(255, 255, 255, 0.72)` |
| 幽灵按钮边框 | `.ghost-btn` border | `rgba(61, 125, 240, 0.16)` | `rgba(61, 125, 240, 0.16)` |
| 危险按钮文字 | `.danger-btn` color | `#d14343` | `rgb(209, 67, 67)` |
| 危险按钮背景 | `.danger-btn` background | `#fff2f2` | `rgb(255, 242, 242)` |
| FAB 按钮背景 | `.fab` | `rgba(255, 255, 255, 0.45)` | `rgba(255, 255, 255, 0.45)` |
| FAB 按钮阴影 | `.fab` box-shadow(外) | `rgba(200, 160, 255, 0.25)` | `rgba(200, 160, 255, 0.25)` |
| FAB 按钮内高光 | `.fab` box-shadow(inset) | `rgba(255, 255, 255, 0.9)` | `rgba(255, 255, 255, 0.9)` |
| FAB 流光渐变色1 | `.fab::before` | `#ffb4c8` | `rgb(255, 180, 200)` |
| FAB 流光渐变色2 | `.fab::before` | `#c8a0ff` | `rgb(200, 160, 255)` |
| FAB 流光渐变色3 | `.fab::before` | `#a0c8ff` | `rgb(160, 200, 255)` |
| FAB 流光渐变色4 | `.fab::before` | `#ffe0e9` | `rgb(255, 224, 233)` |
| FAB 加号文字 | `.fab-text` | `#5E2B97` | `rgb(94, 43, 151)` |
| 标签文字 | `.tag` color | `#245ecb` | `rgb(36, 94, 203)` |
| 标签背景 | `.tag` background | `rgba(235, 242, 255, 0.88)` | `rgba(235, 242, 255, 0.88)` |
| 标签边框 | `.tag` border | `rgba(61, 125, 240, 0.1)` | `rgba(61, 125, 240, 0.1)` |
| 空状态文字 | `.empty` | `#6b7280` | `rgb(107, 114, 128)` |
| 头像文字 | `.avatar` color | `#ffffff` | `rgb(255, 255, 255)` |
| 头像渐变起始 | `.avatar` background | `#f28ec8` | `rgb(242, 142, 200)` |
| 头像渐变终止 | `.avatar` background | `#a75bf4` | `rgb(167, 91, 244)` |
| 输入框文字 | `.input, .textarea` color | `#10131f` | `rgb(16, 19, 31)` |
| 输入框背景 | `.input, .textarea` background | `rgba(255, 255, 255, 0.76)` | `rgba(255, 255, 255, 0.76)` |
| 输入框边框 | `.input, .textarea` border | `rgba(15, 23, 42, 0.08)` | `rgba(15, 23, 42, 0.08)` |
| 输入框内高光 | `.input, .textarea` box-shadow(inset) | `rgba(255, 255, 255, 0.8)` | `rgba(255, 255, 255, 0.8)` |
| 笔记标题文字 | `.note-title` | `#10131f` | `rgb(16, 19, 31)` |
| 笔记元信息文字 | `.note-meta` color | `#6b7280` | `rgb(107, 114, 128)` |
| 笔记正文文字 | `.note-content` color | `#424957` | `rgb(66, 73, 87)` |

---

## 3. 首页 — pages/index/index

| 元素内容 | CSS 选择器 | 颜色 | RGB 值 |
|---------|-----------|------|--------|
| 页面底色 | `.home-page` background-color | `#fdfdfe` | `rgb(253, 253, 254)` |
| 背景光晕1（粉） | `.home-page` gradient | `rgba(255, 180, 200, 0.25)` | `rgba(255, 180, 200, 0.25)` |
| 背景光晕2（紫） | `.home-page` gradient | `rgba(200, 160, 255, 0.2)` | `rgba(200, 160, 255, 0.2)` |
| 背景光晕3（蓝） | `.home-page` gradient | `rgba(160, 200, 255, 0.25)` | `rgba(160, 200, 255, 0.25)` |
| 背景光晕4（粉） | `.home-page` gradient | `rgba(255, 200, 220, 0.25)` | `rgba(255, 200, 220, 0.25)` |
| "本周阅读记录" | `.hero-kicker` | `#8049b4` | `rgb(128, 73, 180)` |
| 主标题 | `.hero-title` | `#10131f` | `rgb(16, 19, 31)` |
| 统计卡片背景 | `.stat-card` | `rgba(255, 255, 255, 0.45)` | `rgba(255, 255, 255, 0.45)` |
| 统计卡片边框 | `.stat-card` border | `rgba(255, 255, 255, 0.8)` | `rgba(255, 255, 255, 0.8)` |
| 统计卡片外阴影 | `.stat-card` box-shadow(外) | `rgba(31, 38, 135, 0.05)` | `rgba(31, 38, 135, 0.05)` |
| 统计卡片内高光 | `.stat-card` box-shadow(inset) | `rgba(255, 255, 255, 0.9)` | `rgba(255, 255, 255, 0.9)` |
| 统计标签文字 | `.stat-label, .stat-note` | `#6b7280` | `rgb(107, 114, 128)` |
| 统计数字 | `.stat-number` | `#f283c4` | `rgb(242, 131, 196)` |
| 排名卡片背景 | `.ranking-card` | `rgba(255, 255, 255, 0.45)` | `rgba(255, 255, 255, 0.45)` |
| 排名卡片边框 | `.ranking-card` border | `rgba(255, 255, 255, 0.8)` | `rgba(255, 255, 255, 0.8)` |
| 排名行分隔线 | `.rank-row` border-bottom | `#f1f3f6` | `rgb(241, 243, 246)` |
| 排名序号 | `.rank-index` | `#f283c4` | `rgb(242, 131, 196)` |
| 排名用户名 | `.rank-name` | `#10131f` | `rgb(16, 19, 31)` |
| 排名副文字 | `.rank-sub` | `#6b7280` | `rgb(107, 114, 128)` |
| 排名笔记数 | `.rank-count` | `#10131f` | `rgb(16, 19, 31)` |
| "查看 TOP 20" | `.ranking-more` | `#9d56c4` | `rgb(157, 86, 196)` |

---

## 4. 笔记列表页 — pages/notes/notes

### 4.1 列表部分

| 元素内容 | CSS 选择器 | 颜色 | RGB 值 |
|---------|-----------|------|--------|
| 页面底色 | `.notes-shell` background-color | `#fdfdfe` | `rgb(253, 253, 254)` |
| 背景光晕（4个） | `.notes-shell` gradients | 同首页 | 同首页 |
| 筛选栏/卡片背景 | `.filter-bar, .user-panel, .note-card` | `rgba(255, 255, 255, 0.45)` | `rgba(255, 255, 255, 0.45)` |
| 筛选栏边框 | `.filter-bar` border | `rgba(255, 255, 255, 0.8)` | `rgba(255, 255, 255, 0.8)` |
| 筛选栏外阴影 | `.filter-bar` box-shadow(外) | `rgba(31, 38, 135, 0.05)` | `rgba(31, 38, 135, 0.05)` |
| 筛选栏内高光 | `.filter-bar` box-shadow(inset) | `rgba(255, 255, 255, 0.9)` | `rgba(255, 255, 255, 0.9)` |
| 筛选chip文字 | `.filter-chip` color | `#a738ed` | `rgb(167, 56, 237)` |
| 筛选chip背景 | `.filter-chip` background | `rgba(246, 235, 255, 0.92)` | `rgba(246, 235, 255, 0.92)` |
| 用户面板文字 | `.user-check` color | `#374151` | `rgb(55, 65, 81)` |
| 复选框颜色 | `checkbox` color 属性 | `#4A90D9` | `rgb(74, 144, 217)` |
| 重置按钮文字 | `.reset-btn` color | `#6b7280` | `rgb(107, 114, 128)` |
| 重置按钮背景 | `.reset-btn` background | `#f8f9fa` | `rgb(248, 249, 250)` |
| 头像文字 | `.avatar` color | `#ffffff` | `rgb(255, 255, 255)` |
| 头像渐变起始 | `.avatar` background | `#FF9A9E` | `rgb(255, 154, 158)` |
| 头像渐变终止 | `.avatar` background | `#A18CD1` | `rgb(161, 140, 209)` |
| 头像阴影 | `.avatar` box-shadow | `rgba(161, 140, 209, 0.3)` | `rgba(161, 140, 209, 0.3)` |
| 列表底部文字 | `.list-footer` color | `#9ca3af` | `rgb(156, 163, 175)` |

### 4.2 详情弹窗部分

| 元素内容 | CSS 选择器 | 颜色 | RGB 值 |
|---------|-----------|------|--------|
| 弹窗遮罩 | `.detail-mask` background | `rgba(16, 19, 31, 0.34)` | `rgba(16, 19, 31, 0.34)` |
| 详情卡片背景 | `.deck-card` | `#ffffff` | `rgb(255, 255, 255)` |
| 详情卡片阴影(外1) | `.deck-card` box-shadow | `rgba(0, 0, 0, 0.06)` | `rgba(0, 0, 0, 0.06)` |
| 详情卡片阴影(外2) | `.deck-card` box-shadow | `rgba(0, 0, 0, 0.04)` | `rgba(0, 0, 0, 0.04)` |
| 详情卡片边框 | `.deck-card` border | `rgba(0, 0, 0, 0.03)` | `rgba(0, 0, 0, 0.03)` |
| 拖拽把手 | `.detail-grip` | `#E5E5EA` | `rgb(229, 229, 234)` |
| 书名标题 | `.detail-title` | `#9287A1` | `rgb(146, 135, 161)` |
| 元信息文字 | `.note-meta` color | `#000000` | `rgb(0, 0, 0)` |
| 元信息透明度 | `.note-meta text` opacity | `0.85` | — |
| 副标题（摘抄/阅读感悟） | `.section-subtitle` | `#6D3D9E` | `rgb(109, 61, 158)` |
| 摘抄正文 | `.detail-body` color | `#1D1D1F` | `rgb(29, 29, 31)` |
| 阅读感悟正文 | `.detail-body-plain` color | `#1D1D1F` | `rgb(29, 29, 31)` |
| 阅读感悟标题 | `.reflection-title` | `#1a1a2e` | `rgb(26, 26, 46)` |
| 阅读感悟旧样式 | `.reflection` color | `#333336` | `rgb(51, 51, 54)` |
| 标签文字 | `.tag` color | `#5E2B97` | `rgb(94, 43, 151)` |
| 标签渐变起始 | `.tag` background | `rgba(255, 180, 200, 0.15)` | `rgba(255, 180, 200, 0.15)` |
| 标签渐变终止 | `.tag` background | `rgba(200, 150, 255, 0.15)` | `rgba(200, 150, 255, 0.15)` |
| 标签边框 | `.tag` border | `rgba(255, 255, 255, 0.85)` | `rgba(255, 255, 255, 0.85)` |
| 标签外阴影 | `.tag` box-shadow(外) | `rgba(175, 82, 222, 0.06)` | `rgba(175, 82, 222, 0.06)` |
| 标签内高光 | `.tag` box-shadow(inset) | `rgba(255, 255, 255, 0.7)` | `rgba(255, 255, 255, 0.7)` |
| 图片占位背景 | `.note-image` background | `#eef2f7` | `rgb(238, 242, 247)` |
| 底部遮罩渐变 | `.detail-footer` background | `rgba(255,255,255,0)` → `rgba(255,255,255,0.92)` → `#ffffff` | `rgb(255, 255, 255)` |
| 收藏按钮未激活背景 | `.neon-capsule-btn` | `rgba(230, 20, 70, 0.22)` / `rgba(135, 35, 205, 0.22)` | `rgba(230, 20, 70, 0.22)` / `rgba(135, 35, 205, 0.22)` |
| 收藏按钮未激活边框 | `.neon-capsule-btn` border | `rgba(255, 255, 255, 0.35)` | `rgba(255, 255, 255, 0.35)` |
| 收藏按钮未激活外阴影 | `.neon-capsule-btn` box-shadow(外) | `rgba(135, 35, 205, 0.15)` | `rgba(135, 35, 205, 0.15)` |
| 收藏按钮未激活内高光 | `.neon-capsule-btn` box-shadow(inset) | `rgba(255, 255, 255, 0.4)` | `rgba(255, 255, 255, 0.4)` |
| 收藏按钮激活背景 | `.neon-capsule-btn.fav-active` | `rgba(255, 90, 130, 0.35)` / `rgba(175, 82, 222, 0.35)` | `rgba(255, 90, 130, 0.35)` / `rgba(175, 82, 222, 0.35)` |
| 收藏按钮激活边框 | `.neon-capsule-btn.fav-active` border | `rgba(255, 255, 255, 0.85)` | `rgba(255, 255, 255, 0.85)` |
| 收藏按钮激活核心亮边 | `.neon-capsule-btn.fav-active` box-shadow(1) | `rgba(255, 255, 255, 0.6)` | `rgba(255, 255, 255, 0.6)` |
| 收藏按钮激活粉光 | `.neon-capsule-btn.fav-active` box-shadow(2) | `rgba(255, 90, 130, 0.35)` | `rgba(255, 90, 130, 0.35)` |
| 收藏按钮激活紫光 | `.neon-capsule-btn.fav-active` box-shadow(3) | `rgba(175, 82, 222, 0.3)` | `rgba(175, 82, 222, 0.3)` |
| 收藏按钮激活内高光 | `.neon-capsule-btn.fav-active` box-shadow(inset) | `rgba(255, 255, 255, 0.5)` | `rgba(255, 255, 255, 0.5)` |
| 五角星图标描边 | `.fav-star-icon` SVG stroke | `%23ffffff` → `#ffffff` | `rgb(255, 255, 255)` |
| 五角星图标投影 | `.fav-star-icon` filter | `rgba(255, 255, 255, 0.4)` | `rgba(255, 255, 255, 0.4)` |

---

## 5. 我的页面 — pages/profile/profile

| 元素内容 | CSS 选择器 | 颜色 | RGB 值 |
|---------|-----------|------|--------|
| 页面底色 | `.profile-page` background-color | `#fdfdfe` | `rgb(253, 253, 254)` |
| 背景光晕（4个） | `.profile-page` gradients | 同首页 | 同首页 |
| 用户名 | `.profile-name` | `#10131f` | `rgb(16, 19, 31)` |
| 个性签名 | `.profile-bio` | `#6b7280` | `rgb(107, 114, 128)` |
| 数据面板背景 | `.stat-panel` | `rgba(255, 255, 255, 0.45)` | `rgba(255, 255, 255, 0.45)` |
| 数据面板边框 | `.stat-panel` border | `rgba(255, 255, 255, 0.8)` | `rgba(255, 255, 255, 0.8)` |
| 数据面板外阴影 | `.stat-panel` box-shadow(外) | `rgba(31, 38, 135, 0.05)` | `rgba(31, 38, 135, 0.05)` |
| 数据面板内高光 | `.stat-panel` box-shadow(inset) | `rgba(255, 255, 255, 0.9)` | `rgba(255, 255, 255, 0.9)` |
| 统计数字 | `.profile-stat-number` | `#8b58ac` | `rgb(139, 88, 172)` |
| 统计标签 | `.profile-stat-label` | `#6b7280` | `rgb(107, 114, 128)` |
| 菜单列表背景 | `.menu-list` | `rgba(255, 255, 255, 0.45)` | `rgba(255, 255, 255, 0.45)` |
| 菜单列表边框 | `.menu-list` border | `rgba(255, 255, 255, 0.8)` | `rgba(255, 255, 255, 0.8)` |
| 菜单项文字 | `.menu-item` color | `#10131f` | `rgb(16, 19, 31)` |
| 菜单项分隔线 | `.menu-item` border-bottom | `#f1f3f6` | `rgb(241, 243, 246)` |
| 菜单箭头 | `.menu-arrow` | `#c0c4cc` | `rgb(192, 196, 204)` |

---

## 6. 排名页 — pages/ranking/ranking

| 元素内容 | CSS 选择器 | 颜色 | RGB 值 |
|---------|-----------|------|--------|
| 页面底色 | `.ranking-page` background-color | `#fdfdfe` | `rgb(253, 253, 254)` |
| 背景光晕（4个） | `.ranking-page` gradients | 同首页 | 同首页 |
| "TOP 20" 标题 | `.head-title` | `#10131f` | `rgb(16, 19, 31)` |
| 副说明文字 | `.head-sub` | `#6b7280` | `rgb(107, 114, 128)` |
| 排名序号 | `.rank-number` | `#ef86b2` | `rgb(239, 134, 178)` |
| 用户名 | `.rank-name` | 继承 `.note-title` `#10131f` | `rgb(16, 19, 31)` |
| 副文字 | `.rank-sub` | `#6b7280` | `rgb(107, 114, 128)` |
| 笔记数 | `.rank-note-count` | `#10131f` | `rgb(16, 19, 31)` |

---

## 7. 新增/编辑笔记页 — pages/note-edit/note-edit

| 元素内容 | CSS 选择器 | 颜色 | RGB 值 |
|---------|-----------|------|--------|
| 页面底色 | `.edit-page` background-color | `#fdfdfe` | `rgb(253, 253, 254)` |
| 背景光晕（4个） | `.edit-page` gradients | 同首页 | 同首页 |
| 输入区背景（毛玻璃） | `.field` background(1) | `rgba(255, 255, 255, 0.45)` | `rgba(255, 255, 255, 0.45)` |
| 输入区背景（2次定义） | `.field` background(2) | `rgba(255, 255, 255, 0.78)` | `rgba(255, 255, 255, 0.78)` |
| 输入区边框 | `.field` border | `rgba(255, 255, 255, 0.9)` | `rgba(255, 255, 255, 0.9)` |
| 输入区外阴影 | `.field` box-shadow(外) | `rgba(15, 23, 42, 0.06)` | `rgba(15, 23, 42, 0.06)` |
| 输入区内高光 | `.field` box-shadow(inset) | `rgba(255, 255, 255, 0.9)` | `rgba(255, 255, 255, 0.9)` |
| 字段标签 | `.field-label` | `#10131f` | `rgb(16, 19, 31)` |
| 字数统计 | `.counter, .image-tip` | `#9ca3af` | `rgb(156, 163, 175)` |
| 标签文字（未选中） | `.tag` color | `#5E2B97` | `rgb(94, 43, 151)` |
| 标签背景（未选中） | `.tag` background | `rgba(255, 180, 200, 0.15)` / `rgba(200, 150, 255, 0.15)` | 同上 |
| 标签文字（选中） | `.tag-selected` color | `#4A1D7B` | `rgb(74, 29, 123)` |
| 标签背景（选中） | `.tag-selected` background | `rgba(255, 180, 200, 0.4)` / `rgba(200, 150, 255, 0.4)` | `rgba(255, 180, 200, 0.4)` / `rgba(200, 150, 255, 0.4)` |
| 标签选中阴影 | `.tag-selected` box-shadow | `rgba(161, 140, 209, 0.2)` | `rgba(161, 140, 209, 0.2)` |
| 添加标签按钮文字 | `.add-tag-btn` color | `#A18CD1` | `rgb(161, 140, 209)` |
| 添加标签按钮背景 | `.add-tag-btn` | `rgba(255, 255, 255, 0.15)` | `rgba(255, 255, 255, 0.15)` |
| 添加标签按钮内高光 | `.add-tag-btn` box-shadow(inset) | `rgba(255, 255, 255, 0.8)` | `rgba(255, 255, 255, 0.8)` |
| 添加标签按钮外阴影 | `.add-tag-btn` box-shadow(外) | `rgba(253, 154, 186, 0.35)` | `rgba(253, 154, 186, 0.35)` |
| 添加标签流光渐变1 | `.add-tag-btn::before` | `#fd9aba` | `rgb(253, 154, 186)` |
| 添加标签流光渐变2 | `.add-tag-btn::before` | `#A18CD1` | `rgb(161, 140, 209)` |
| 图片区背景 | `.image-wrap, .add-image` background | `#f8f9fa` | `rgb(248, 249, 250)` |
| 图片区边框 | `.image-wrap, .add-image` border | `#c8d7e8` | `rgb(200, 215, 232)` |
| 删除图片按钮文字 | `.remove-image` color | `#ffffff` | `rgb(255, 255, 255)` |
| 删除图片按钮背景 | `.remove-image` background | `rgba(17, 24, 39, 0.62)` | `rgba(17, 24, 39, 0.62)` |
| "添加"加号文字 | `.add-image` color | `#4a90d9` | `rgb(74, 144, 217)` |
| 删除笔记按钮渐变1 | `.delete-btn` | `#ffef73` | `rgb(255, 239, 115)` |
| 删除笔记按钮渐变2 | `.delete-btn` | `#ff6c6c` | `rgb(255, 108, 108)` |
| 取消按钮文字 | `.footer-actions button:first-child` | `#6b7280` | `rgb(107, 114, 128)` |
| 取消按钮外阴影 | `.footer-actions button:first-child` box-shadow(外) | `rgba(107, 114, 128, 0.1)` | `rgba(107, 114, 128, 0.1)` |
| 取消按钮流光渐变1 | `.footer-actions button:first-child::before` | `#e5e7eb` | `rgb(229, 231, 235)` |
| 取消按钮流光渐变2 | `.footer-actions button:first-child::before` | `#9ca3af` | `rgb(156, 163, 175)` |
| 保存按钮文字 | `.footer-actions button:last-child` | `#7a5cff` | `rgb(122, 92, 255)` |
| 保存按钮外阴影 | `.footer-actions button:last-child` box-shadow(外) | `rgba(122, 92, 255, 0.3)` | `rgba(122, 92, 255, 0.3)` |
| 保存按钮流光渐变1 | `.footer-actions button:last-child::before` | `#5aa8ff` | `rgb(90, 168, 255)` |
| 保存按钮流光渐变2 | `.footer-actions button:last-child::before` | `#7a5cff` | `rgb(122, 92, 255)` |
| 渐变按钮文字 | `.gradient-btn` color | `#fff` | `rgb(255, 255, 255)` |
| 渐变按钮渐变1 | `.gradient-btn` | `#ff999c` | `rgb(255, 153, 156)` |
| 渐变按钮渐变2 | `.gradient-btn` | `#A18CD1` | `rgb(161, 140, 209)` |

---

## 8. 我的笔记页 — pages/my-notes/my-notes

| 元素内容 | CSS 选择器 | 颜色 | RGB 值 |
|---------|-----------|------|--------|
| 页面底色 | `.my-notes-shell` background-color | `#fdfdfe` | `rgb(253, 253, 254)` |
| 背景光晕（4个） | `.my-notes-shell` gradients | 同首页 | 同首页 |
| 搜索栏背景 | `.my-search` | `rgba(255, 255, 255, 0.78)` | `rgba(255, 255, 255, 0.78)` |
| 搜索栏阴影 | `.my-search` box-shadow | `rgba(15, 23, 42, 0.07)` | `rgba(15, 23, 42, 0.07)` |
| 笔记卡片标题 | `.note-title` | `#2c3e50` | `rgb(44, 62, 80)` |
| 笔记卡片元信息 | `.note-meta` color | `#7f8c8d` | `rgb(127, 140, 141)` |
| 笔记卡片正文 | `.note-content` color | `#34495e` | `rgb(52, 73, 94)` |
| 卡片背景 | `.my-note-card` | `rgba(255, 255, 255, 0.45)` | `rgba(255, 255, 255, 0.45)` |
| 卡片边框 | `.my-note-card` border | `rgba(255, 255, 255, 0.8)` | `rgba(255, 255, 255, 0.8)` |
| 卡片外阴影 | `.my-note-card` box-shadow(外) | `rgba(31, 38, 135, 0.05)` | `rgba(31, 38, 135, 0.05)` |
| 卡片内高光 | `.my-note-card` box-shadow(inset) | `rgba(255, 255, 255, 0.9)` | `rgba(255, 255, 255, 0.9)` |
| 编辑按钮文字 | `.btn-edit` color | `#6f2abe` | `rgb(111, 42, 190)` |
| 编辑按钮流光渐变1 | `.btn-edit::before` | `#feb1f1` | `rgb(254, 177, 241)` |
| 编辑按钮流光渐变2 | `.btn-edit::before` | `#8e1dbf` | `rgb(142, 29, 191)` |
| 删除按钮文字 | `.btn-delete` color | `#f47579` | `rgb(244, 117, 121)` |
| 删除按钮流光渐变1 | `.btn-delete::before` | `#f7cb73` | `rgb(247, 203, 115)` |
| 删除按钮流光渐变2 | `.btn-delete::before` | `#f57c7c` | `rgb(245, 124, 124)` |

---

## 9. 收藏页 — pages/favorites/favorites

| 元素内容 | CSS 选择器 | 颜色 | RGB 值 |
|---------|-----------|------|--------|
| 页面底色 | `.favorites-page` background-color | `#fdfdfe` | `rgb(253, 253, 254)` |
| 背景光晕（4个） | `.favorites-page` gradients | 同首页 | 同首页 |
| 收藏按钮（使用全局 `.primary-btn`） | `.primary-btn.favorite-btn` | `#ffffff` 文字 / `#3d7df0`→`#7a5cff` 渐变背景 | `rgb(255,255,255)` / `rgb(61,125,240)`→`rgb(122,92,255)` |

---

## 10. 成就页 — pages/achievements/achievements

| 元素内容 | CSS 选择器 | 颜色 | RGB 值 |
|---------|-----------|------|--------|
| 页面底色 | `.achievements-page` background-color | `#fdfdfe` | `rgb(253, 253, 254)` |
| 背景光晕（4个） | `.achievements-page` gradients | 同首页 | 同首页 |
| 成就卡片背景（未激活） | `.achievement-card` | `rgba(255, 255, 255, 0.25)` | `rgba(255, 255, 255, 0.25)` |
| 成就卡片边框（未激活） | `.achievement-card` border | `rgba(255, 255, 255, 0.5)` | `rgba(255, 255, 255, 0.5)` |
| 成就卡片阴影（未激活） | `.achievement-card` box-shadow | `rgba(31, 38, 135, 0.02)` | `rgba(31, 38, 135, 0.02)` |
| 成就标题（未激活） | `.achievement-title` | `#7f8c8d` | `rgb(127, 140, 141)` |
| 成就描述（未激活） | `.achievement-desc` | `#95a5a6` | `rgb(149, 165, 166)` |
| 成就卡片背景（激活） | `.achievement-card.active` | `rgba(255, 255, 255, 0.45)` | `rgba(255, 255, 255, 0.45)` |
| 成就卡片外阴影（激活） | `.achievement-card.active` box-shadow(外) | `rgba(200, 160, 255, 0.2)` | `rgba(200, 160, 255, 0.2)` |
| 成就卡片内高光（激活） | `.achievement-card.active` box-shadow(inset) | `rgba(255, 255, 255, 0.9)` | `rgba(255, 255, 255, 0.9)` |
| 成就标题（激活） | `.achievement-card.active .achievement-title` | `#10131f` | `rgb(16, 19, 31)` |
| 成就标题文字阴影（激活） | `.achievement-card.active .achievement-title` text-shadow | `rgba(255, 255, 255, 0.5)` | `rgba(255, 255, 255, 0.5)` |
| 成就描述（激活） | `.achievement-card.active .achievement-desc` | `#4b5563` | `rgb(75, 85, 99)` |
| 流光边框渐变1 | `.achievement-card.active::before` | `#ffb4c8` | `rgb(255, 180, 200)` |
| 流光边框渐变2 | `.achievement-card.active::before` | `#c8a0ff` | `rgb(200, 160, 255)` |
| 流光边框渐变3 | `.achievement-card.active::before` | `#a0c8ff` | `rgb(160, 200, 255)` |
| 流光边框渐变4 | `.achievement-card.active::before` | `#ffe0e9` | `rgb(255, 224, 233)` |

---

## 11. 阅读统计页 — pages/reading-stats/reading-stats

| 元素内容 | CSS 选择器 | 颜色 | RGB 值 |
|---------|-----------|------|--------|
| 页面底色 | `.reading-stats-page` background-color | `#fdfdfe` | `rgb(253, 253, 254)` |
| 背景光晕（4个） | `.reading-stats-page` gradients | 同首页 | 同首页 |
| 列表卡片背景 | `.list-card` | `rgba(255, 255, 255, 0.45)` | `rgba(255, 255, 255, 0.45)` |
| 列表卡片边框 | `.list-card` border | `rgba(255, 255, 255, 0.8)` | `rgba(255, 255, 255, 0.8)` |
| 列表卡片外阴影 | `.list-card` box-shadow(外) | `rgba(31, 38, 135, 0.05)` | `rgba(31, 38, 135, 0.05)` |
| 列表卡片内高光 | `.list-card` box-shadow(inset) | `rgba(255, 255, 255, 0.9)` | `rgba(255, 255, 255, 0.9)` |
| 统计行分隔线 | `.stat-row` border-bottom | `rgba(15, 23, 42, 0.06)` | `rgba(15, 23, 42, 0.06)` |
| 统计数值 | `.row-count` | `#b6268b` | `rgb(182, 38, 139)` |
