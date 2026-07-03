// pages/trajectory/trajectory.js
const { syncTabBar } = require('../../utils/tabbar');

// 书籍（Y 轴固定位置）
const BOOKS = [
  { id: 1, y: 0.15, color: '#8049b4', name: '悉达多' },
  { id: 2, y: 0.38, color: '#3d7df0', name: '认知觉醒' },
  { id: 3, y: 0.62, color: '#34d399', name: '黑客与画家' },
  { id: 4, y: 0.85, color: '#f59e0b', name: '存在主义' }
];

const MODES = [
  { key: 'day',   label: '日' },
  { key: 'month', label: '月' },
  { key: 'year',  label: '年' }
];

const X_LABELS = {
  day:   ['6/13', '6/14', '6/15', '6/16', '6/17', '6/18', '6/19'],
  month: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  year:  ['2024', '2025', '2026']
};

// Mock 数据 —— count 表示该节点记录的卡片数，用于线宽变化
const MOCK = {
  day: [
    { x: 0, day: '6/13', bookId: 4, count: 2, tag: '摘录', text: '自由是存在主义的核心。' },
    { x: 1, day: '6/14', bookId: 4, count: 1, tag: '感悟', text: '人被判定为自由，这是一种沉重的负担。' },
    { x: 2, day: '6/15', type: 'pause' },
    { x: 3, day: '6/16', bookId: 2, count: 3, tag: '方法', text: '触动神经的知识，才记录。' },
    { x: 4, day: '6/17', bookId: 3, count: 1, tag: '摘录', text: '好的代码像诗。' },
    { x: 5, day: '6/18', bookId: 2, count: 5, tag: '感悟', text: '专注力是最高级的生产力。', milestone: '🏆' },
    { x: 6, day: '6/19', bookId: 1, count: 2, tag: '金句', text: '我通过我的灵魂与肉体得知，必需堕落。' }
  ],
  month: [
    { x: 0,  bookId: 2, count: 3 },
    { x: 1,  bookId: 2, count: 5 },
    { x: 1,  bookId: 4, count: 2 },
    { x: 2,  bookId: 4, count: 8 },
    { x: 2,  bookId: 1, count: 4 },
    { x: 3,  bookId: 3, count: 6 },
    { x: 4,  bookId: 2, count: 12 },
    { x: 4,  bookId: 3, count: 3 },
    { x: 4,  bookId: 1, count: 5 },
    { x: 5,  bookId: 1, count: 9 },
    { x: 5,  bookId: 2, count: 6 },
    { x: 5,  bookId: 4, count: 4 },
    { x: 6,  bookId: 4, count: 15, milestone: '🏆' },
    { x: 6,  bookId: 2, count: 8 },
    { x: 7,  bookId: 2, count: 7 },
    { x: 7,  bookId: 3, count: 4 },
    { x: 8,  bookId: 3, count: 10 },
    { x: 8,  bookId: 1, count: 3 },
    { x: 9,  bookId: 2, count: 11 },
    { x: 9,  bookId: 4, count: 6 },
    { x: 10, bookId: 1, count: 8 },
    { x: 10, bookId: 3, count: 5 },
    { x: 11, bookId: 4, count: 14 },
    { x: 11, bookId: 2, count: 7 },
    { x: 11, bookId: 1, count: 3 }
  ],
  year: [
    { x: 0, label: '2024', bookId: 2, count: 86 },
    { x: 0, label: '2024', bookId: 4, count: 52 },
    { x: 1, label: '2025', bookId: 4, count: 120, milestone: '🏆' },
    { x: 1, label: '2025', bookId: 1, count: 68 },
    { x: 1, label: '2025', bookId: 2, count: 45 },
    { x: 2, label: '2026', bookId: 1, count: 48 },
    { x: 2, label: '2026', bookId: 3, count: 32 }
  ]
};

// X 坐标映射：将整数索引映射到完整画布坐标
function mapX(x, w, labelCount) {
  const PADDING_X = 40;
  const progress = x / Math.max(1, labelCount - 1);
  return progress * (w - PADDING_X * 2) + PADDING_X;
}

Page({
  data: {
    pageHeight: 680,
    navHeight: 88,
    chartCardHeight: 500,
    currentMode: 'day',
    modes: MODES,
    books: BOOKS,
    canvasWidthPx: 400,
    scrollLeftValue: 9999,
    activeNodeIndex: null,
    focusedBookId: null,
    renderPoints: [],
    xLabels: X_LABELS.day,
    xLabelPositions: [],
  },

  // 滚动事件：更新 scrollLeft，触发 translate 重绘
  onCanvasScroll(e) {
    this.scrollLeft = e.detail.scrollLeft;
    if (this.canvasNode) {
      this.canvasNode.requestAnimationFrame(() => this.renderFrame());
    }
  },

  onLoad() {
    this.updatePageHeight();
  },

  onReady() {
    this.calculateTrajectory();
  },

  onShow() {
    syncTabBar(this, 2);
  },

  updatePageHeight() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const navHeight = (info.statusBarHeight || 44) + 44;
    const chartCardHeight = info.windowHeight - navHeight - 140;
    this.setData({
      pageHeight: info.windowHeight,
      navHeight,
      chartCardHeight: Math.max(chartCardHeight, 400)
    });
  },

  // 核心计算：预计算完整轨迹所有点坐标，存 this.trajectoryPoints
  calculateTrajectory() {
    const query = wx.createSelectorQuery();
    query.select('.chart-area').boundingClientRect((rect) => {
      if (!rect) return;

      const mode = this.data.currentMode;
      const currentXLabels = X_LABELS[mode] || [];
      const labelCount = currentXLabels.length;
      const PADDING_X = 40;
      const PADDING_Y = 40;
      const chartHeight = rect.height;

      // 完整轨迹宽度：数据少时撑满一屏，数据多时按每标签 60px 延伸
      const dataWidth = labelCount * 60 + PADDING_X * 2;
      const finalCanvasWidth = Math.max(rect.width, dataWidth);
      const availableHeight = chartHeight - PADDING_Y * 2;

      const booksMap = {};
      this.data.books.forEach(b => booksMap[b.id] = b);

      let rawList = MOCK[mode] || [];
      const dataList = [...rawList].sort((a, b) => a.x - b.x);

      // 预计算完整轨迹点坐标（基于完整宽度 finalCanvasWidth）
      let renderPoints = [];
      let allPoints = [];
      let pausePoints = [];
      dataList.forEach((item) => {
        const px = mapX(item.x, finalCanvasWidth, labelCount);
        const bookCfg = booksMap[item.bookId];
        const py = bookCfg ? (PADDING_Y + bookCfg.y * availableHeight) : PADDING_Y;
        const color = bookCfg ? bookCfg.color : '#fff';

        if (item.type !== 'pause') {
          renderPoints.push({ ...item, px, py, color, tag: item.tag, text: item.text });
          allPoints.push({ ...item, px, py, color, bookId: item.bookId, count: item.count || 1 });
        } else {
          pausePoints.push({ ...item, px, py, type: 'pause' });
        }
      });

      // 按"最近邻"策略排序：保证线条不交叉，每个点度最多为 2
      // 1. 按 x（月份/年份）分组
      // 2. 每组内按 Y 坐标排序
      // 3. 月份之间：上月出口点连接到当前月最近的端点（上端或下端）
      // 4. 当前月内：从入口端点顺序连接到另一端点
      const groups = {};
      allPoints.forEach(p => {
        const key = p.x;
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      });

      const sortedX = Object.keys(groups).map(Number).sort((a, b) => a - b);
      let trajectoryPoints = [];
      let lastPoint = null;

      sortedX.forEach(x => {
        let group = groups[x].sort((a, b) => a.py - b.py); // 按 Y 从上到下

        if (lastPoint) {
          // 计算上月出口点到当前月上端和下端的距离
          const distToTop = Math.abs(lastPoint.py - group[0].py);
          const distToBottom = Math.abs(lastPoint.py - group[group.length - 1].py);
          // 如果下端更近，则从下往上连接（反转数组）
          if (distToBottom < distToTop) {
            group = group.reverse();
          }
        }

        trajectoryPoints = trajectoryPoints.concat(group);
        lastPoint = group[group.length - 1]; // 当前月的出口点
      });

      // 加入暂停点
      trajectoryPoints = trajectoryPoints.concat(pausePoints);

      // 缓存预计算的轨迹数据，供 renderFrame 使用
      this.trajectoryPoints = trajectoryPoints;
      const validCounts = trajectoryPoints.filter(p => p.type !== 'pause').map(p => p.count || 1);
      this.trajectoryConfig = {
        mode,
        labelCount,
        canvasWidth: finalCanvasWidth,
        paddingY: PADDING_Y,
        availableHeight,
        focused: this.data.focusedBookId,
        maxCount: Math.max(...validCounts),
        minCount: Math.min(...validCounts),
        clipLeft: PADDING_X,
        clipRight: finalCanvasWidth - PADDING_X
      };

      // 👇 🌟 新增：动态计算每个节点的缩放倍率 (根据笔记数量 count)
      renderPoints = renderPoints.map(p => {
        let scale = 1;
        // 如果不是日模式，且数量存在差异，则计算缩放
        if (mode !== 'day' && this.trajectoryConfig.maxCount > this.trajectoryConfig.minCount) {
          const ratio = ((p.count || 1) - this.trajectoryConfig.minCount) / (this.trajectoryConfig.maxCount - this.trajectoryConfig.minCount);
          scale = 1 + ratio * 0.5; 
        } else if (mode !== 'day') {
          scale = 1; // 数量都一样时，给个基础放大值
        }
        return { ...p, scale };
      });

      // 计算出最右侧的精确滚动坐标
      const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const rpxRatio = sys.windowWidth / 750;
      // 因为 CSS 中 chart-scroll 设置了 left: 30rpx，所以实际可视宽度要减去这 30rpx 的物理像素
      const scrollViewportWidth = rect.width - 30 * rpxRatio;
      
      const maxScrollLeft = Math.max(0, finalCanvasWidth - scrollViewportWidth);

      // 1. 同步给 Canvas：让底层轨迹线起点就在最右侧
      this.scrollLeft = maxScrollLeft;
      // X 轴标签位置：与 mapX 完全对齐
      const xLabelPositions = currentXLabels.map((label, i) => ({
        label,
        px: mapX(i, finalCanvasWidth, labelCount)
      }));
      this.setData({
        canvasWidthPx: finalCanvasWidth,
        scrollLeftValue: maxScrollLeft,
        renderPoints,
        xLabels: currentXLabels,
        xLabelPositions
      }, () => {
        this.initCanvas();
      });
    }).exec();
  },

  // 初始化 Canvas：物理尺寸 = 可视区域宽度，缓存 node/ctx
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#trajectoryCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) return;
        this.canvasNode = res[0].node;
        this.canvasCtx = this.canvasNode.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        this.canvasNode.width = res[0].width * dpr;
        this.canvasNode.height = res[0].height * dpr;
        this.canvasCtx.scale(dpr, dpr);
        this.canvasLogicWidth = res[0].width;
        this.canvasLogicHeight = res[0].height;
        this.renderFrame();
      });
  },

  // 渲染一帧：translate(-scrollLeft) + 用预计算坐标绘制完整轨迹
  renderFrame() {
    const ctx = this.canvasCtx;
    if (!ctx || !this.trajectoryPoints) return;

    // 清空可视区域
    ctx.clearRect(0, 0, this.canvasLogicWidth, this.canvasLogicHeight);
    ctx.save();
    // 平移坐标系，模拟滚动
    ctx.translate(-this.scrollLeft, 0);

    const cfg = this.trajectoryConfig;
    if (cfg.mode === 'day') {
      this.drawPrecisePath(ctx, cfg);
    } else {
      this.drawRiverPath(ctx, cfg);
    }

    ctx.restore();
  },

  // 日模式：Catmull-Rom 平滑曲线 + 分段渐变 + 固定细线
  drawPrecisePath(ctx, cfg) {
    const points = this.trajectoryPoints.filter(p => p.type !== 'pause');
    const { focused } = cfg;
    if (points.length < 2) return;

    // Catmull-Rom 样条：x 方向适度偏移（在两点之间，无左右突出），y 方向加大偏移
    const getCtrl = (i) => {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1] || points[i];
      const p3 = points[i + 2] || p2;
      const t = 0.5;
      const dx = p2.px - p1.px;
      return {
        cp1x: p1.px + dx * 0.3,
        cp1y: p1.py + (p2.py - p0.py) * t,
        cp2x: p2.px - dx * 0.3,
        cp2y: p2.py - (p3.py - p1.py) * t
      };
    };

    // 分段绘制，每段独立渐变
    for (let i = 0; i < points.length - 1; i++) {
      const prev = points[i];
      const curr = points[i + 1];
      const isDimmed = focused && prev.bookId !== focused && curr.bookId !== focused;
      const ctrl = getCtrl(i);

      const segGradient = ctx.createLinearGradient(prev.px, prev.py, curr.px, curr.py);
      segGradient.addColorStop(0, prev.color);
      segGradient.addColorStop(1, curr.color);

      ctx.beginPath();
      ctx.moveTo(prev.px, prev.py);
      ctx.bezierCurveTo(ctrl.cp1x, ctrl.cp1y, ctrl.cp2x, ctrl.cp2y, curr.px, curr.py);

      ctx.strokeStyle = segGradient;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = isDimmed ? 0.15 : 0.9;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    
  },

  // 月/年模式：Catmull-Rom 平滑河流 + 分段渐变 + 固定细线
  // 月/年模式：Catmull-Rom 平滑河流 + 分段渐变 + 纯正法向量等宽采样
  drawRiverPath(ctx, cfg) {
    const points = this.trajectoryPoints.filter(p => p.type !== 'pause');
    const { focused, maxCount, minCount } = cfg;
    if (points.length < 2) return;

    // 获取屏幕像素比，计算基础半径
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const rpxRatio = sys.windowWidth / 750;
    const baseRadiusPx = 12 * rpxRatio; 

    const getPointScale = (count) => {
      if (maxCount > minCount) {
        const ratio = ((count || 1) - minCount) / (maxCount - minCount);
        return 0.5 + ratio * 0.5;
      }
      return 0.7;
    };

    const countToHalfWidth = (count) => baseRadiusPx * getPointScale(count);

    // 控制点计算：维持你截图里那种直上直下的优美拱门形态
    const getCtrl = (i) => {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1] || points[i];
      const p3 = points[i + 2] || p2;
      const t = 0.5;
      return {
        cp1x: p1.px,
        cp1y: p1.py + (p2.py - p0.py) * t,
        cp2x: p2.px,
        cp2y: p2.py - (p3.py - p1.py) * t
      };
    };

    // 分段绘制河流
    for (let i = 0; i < points.length - 1; i++) {
      const prev = points[i];
      const curr = points[i + 1];
      const isDimmed = focused && prev.bookId !== focused && curr.bookId !== focused;
      
      const prevHalfW = countToHalfWidth(prev.count);
      const currHalfW = countToHalfWidth(curr.count);
      const ctrl = getCtrl(i);

      const segGradient = ctx.createLinearGradient(prev.px, prev.py, curr.px, curr.py);
      segGradient.addColorStop(0, prev.color);
      segGradient.addColorStop(1, curr.color);

      // 🌟 核心修复：高精度曲线采样计算绝对法向量
      const steps = 30; // 将每段曲线切割为 30 个微小直线段，保证极致平滑
      const topPath = [];
      const bottomPath = [];

      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        // 贝塞尔公式基底
        const u = 1 - t;
        const tt = t * t, uu = u * u;
        const uuu = uu * u, ttt = tt * t;

        // 1. 计算当前点在曲线上的绝对坐标
        const px = uuu * prev.px + 3 * uu * t * ctrl.cp1x + 3 * u * tt * ctrl.cp2x + ttt * curr.px;
        const py = uuu * prev.py + 3 * uu * t * ctrl.cp1y + 3 * u * tt * ctrl.cp2y + ttt * curr.py;

        // 2. 对贝塞尔公式求导，算出当前点的切线方向 (dx, dy)
        const dx = 3 * uu * (ctrl.cp1x - prev.px) + 6 * u * t * (ctrl.cp2x - ctrl.cp1x) + 3 * tt * (curr.px - ctrl.cp2x);
        const dy = 3 * uu * (ctrl.cp1y - prev.py) + 6 * u * t * (ctrl.cp2y - ctrl.cp1y) + 3 * tt * (curr.py - ctrl.cp2y);

        // 3. 将切线方向旋转 90 度，得到绝对垂直的“法向量”
        let len = Math.hypot(dx, dy);
        let nx = 0, ny = 1; 
        if (len > 1e-5) {
          nx = -dy / len; // 垂直 X
          ny = dx / len;  // 垂直 Y
        }

        // 4. 根据 t 平滑计算当前点应该有的宽度（在大泡泡和小泡泡之间均匀缩窄）
        const w = prevHalfW + (currHalfW - prevHalfW) * t;

        // 5. 沿着法向量把宽度推出去，得到真正的边缘点
        topPath.push({ x: px + nx * w, y: py + ny * w });
        bottomPath.push({ x: px - nx * w, y: py - ny * w });
      }

      // 根据算好的完美边缘坐标，连线填充
      ctx.beginPath();
      ctx.moveTo(topPath[0].x, topPath[0].y);
      for (let j = 1; j <= steps; j++) ctx.lineTo(topPath[j].x, topPath[j].y);
      for (let j = steps; j >= 0; j--) ctx.lineTo(bottomPath[j].x, bottomPath[j].y); // 反向闭合下边缘
      ctx.closePath();

      ctx.globalAlpha = isDimmed ? 0.08 : 0.2;
      ctx.fillStyle = segGradient;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 中心轨迹骨架线保持原生绘制，依然丝滑
    for (let i = 0; i < points.length - 1; i++) {
      const prev = points[i];
      const curr = points[i + 1];
      const isDimmed = focused && prev.bookId !== focused && curr.bookId !== focused;
      const ctrl = getCtrl(i);

      const segGradient = ctx.createLinearGradient(prev.px, prev.py, curr.px, curr.py);
      segGradient.addColorStop(0, prev.color);
      segGradient.addColorStop(1, curr.color);

      ctx.beginPath();
      ctx.moveTo(prev.px, prev.py);
      ctx.bezierCurveTo(ctrl.cp1x, ctrl.cp1y, ctrl.cp2x, ctrl.cp2y, curr.px, curr.py);

      ctx.strokeStyle = segGradient;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = isDimmed ? 0.15 : 0.6;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  // ===== 交互 =====

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.currentMode) return;
    this.setData({
      currentMode: mode,
      activeNodeIndex: null,
    }, () => {
      this.calculateTrajectory();
    });
  },

  onNodeTap(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      activeNodeIndex: this.data.activeNodeIndex === index ? null : index
    });
  },

  onBookTap(e) {
    const bookId = e.currentTarget.dataset.bookId;
    this.setData({
      focusedBookId: this.data.focusedBookId === bookId ? null : bookId,
      activeNodeIndex: null
    }, () => {
      this.calculateTrajectory();
    });
  },

  onClosePopover() {
    this.setData({ activeNodeIndex: null });
  }
});
