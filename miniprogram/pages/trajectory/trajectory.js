const COLLAPSE_THRESHOLD = 3; // 超过 3 天没有笔记，触发折叠

// pages/trajectory/trajectory.js
const { syncTabBar } = require('../../utils/tabbar');
const store = require('../../utils/store');

const MODES = [
  { key: 'day',   label: '日' },
  { key: 'month', label: '月' },
  { key: 'year',  label: '年' }
];


// ===== 曲线平滑计算辅助函数 =====

/**
 * 预计算每个节点的全局切线方向 (单位向量)
 * 核心逻辑：只管方向，不管长度。同月必垂直，跨月自然弯。
 */
function computeGlobalTangents(points) {
  points.forEach((p, i) => {
    const pPrev = points[i - 1] || p;
    const pNext = points[i + 1] || p;

    // 判定当前点是否参与同月份的垂直连线
    const isVertPrev = (p.px === pPrev.px && p !== pPrev);
    const isVertNext = (p.px === pNext.px && p !== pNext);

    let dx = 0, dy = 0;
    let isVert = false;

    if (isVertPrev || isVertNext) {
      isVert = true;
      // 🌟 严格 G1 连续：所有垂直节点的切线 = 纯垂直 (0, ±1)
      // 这样同月垂直线段（前一段）和跨月弧线段（后一段）在交汇处切线完全一致，无折角。
      // 曲线在出口节点处"先延续之前的垂直方向，再慢慢转向下一个点"。
      // 曲线在入口节点处"垂直进入下一点，与下一条同月垂直线方向一致"。
      if (isVertPrev && isVertNext) {
        // 中间节点：纯垂直
        dx = 0;
        dy = pNext.py - pPrev.py;
      } else if (isVertPrev) {
        // 出口节点：切线 = 同月垂直线方向（纯垂直，延续来时方向）
        dx = 0;
        dy = p.py - pPrev.py;
      } else {
        // 入口节点：切线 = 下一个同月垂直线方向（纯垂直，对齐将去方向）
        dx = 0;
        dy = pNext.py - p.py;
      }
    } else {
      // 孤立节点（该月仅此1个点）：使用标准 Catmull-Rom 全局方向
      dx = pNext.px - pPrev.px;
      dy = pNext.py - pPrev.py;
    }

    // 将方向归一化为纯粹的单位向量 (ux, uy)
    let len = Math.hypot(dx, dy);
    if (len > 1e-5) {
      p.ux = dx / len;
      p.uy = dy / len;
    } else {
      p.ux = 1; p.uy = 0; // 重叠点兜底保护
    }
    
    // 给节点打上标记，告诉后面的函数它是不是垂直节点
    p.isVert = isVert;
  });
}

/**
 * 根据预计算的切线方向获取两点之间的贝塞尔控制点
 * 🌟 修复尖角的核心 🌟：水平距离锁定法
 */
function getControlPoints(p1, p2) {
  const dx = p2.px - p1.px;
  const dy = p2.py - p1.py;
  const dist = Math.hypot(dx, dy);
  
  let len1, len2;

  if (dx === 0) {
    // 1. 同月连线（纯垂直）：控制杆长度取垂直间距的 35%，保持直线紧致不打结
    len1 = Math.abs(dy) * 0.35;
    len2 = Math.abs(dy) * 0.35;
  } else {
    // 2. 跨月连线（需要画弧度）
    const horizontalDist = Math.abs(dx); // 提取纯水平间距

    // 起点出射控制杆
    if (p1.isVert) {
      // 🌟 核心修复：如果是紫点这种垂直出点，控制杆长度强制与【水平跨度】绑定。
      // 乘以 0.55 意味着曲线会在前进到两个月份正中间时，达到最完美的拐点圆弧。
      len1 = horizontalDist * 0.55; 
    } else {
      len1 = dist * 0.35; // 孤立点则使用标准的距离比例
    }

    // 终点入射控制杆
    if (p2.isVert) {
      // 同理，如果终点是垂直入点，控制杆同样被水平跨度锁死
      len2 = horizontalDist * 0.55;
    } else {
      len2 = dist * 0.35;
    }
  }

  // 兜底安全锁：无论如何控制杆不能超过两点间绝对距离的 80%，防止画面崩坏
  const maxLen = dist * 0.8;
  len1 = Math.min(len1, maxLen);
  len2 = Math.min(len2, maxLen);

  // 控制点沿切线方向放置，保证交汇处 C1 连续（无折角）
  return {
    cp1x: p1.px + p1.ux * len1,
    cp1y: p1.py + p1.uy * len1,
    cp2x: p2.px - p2.ux * len2,
    cp2y: p2.py - p2.uy * len2
  };
}

Page({
  data: {
    pageHeight: 680,
    navHeight: 88,
    chartCardHeight: 500,
    currentMode: 'day',
    modes: MODES,
    books: [],
    canvasWidthPx: 400,
    scrollLeftValue: 9999,
    activeNodeIndex: null,
    focusedBookId: null,
    renderPoints: [],
    xLabels: [],
    xLabelPositions: [],
    loading: true,
    virtualXAxis: [], // 🌟 新增：虚拟 X 轴数据结构，控制渲染和交互
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
    // 节流：5 秒内不重复加载（store 内部也有 5 秒缓存）
    const now = Date.now();
    if (this._lastLoadTime && now - this._lastLoadTime < 5000) return;
    this._lastLoadTime = now;
    if (this.data.books.length) {
      this.calculateTrajectory();
    }
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

// 核心计算：从云函数获取数据 + 预计算完整轨迹所有点坐标
async calculateTrajectory() {
  const mode = this.data.currentMode;
  const trajectoryData = await store.getTrajectoryDataAsync(mode);
  const { books, xLabels: rawXLabels, nodes } = trajectoryData;
  const booksForRender = books.map(b => ({ ...b, id: b.name }));

  this.setData({ books: booksForRender, loading: false }, () => {
    setTimeout(() => {
      const query = wx.createSelectorQuery();
      query.select('.chart-area').boundingClientRect((rect) => {
        if (!rect) return;

        const PADDING_X = 40;
        const PADDING_Y = 40;
        const chartHeight = rect.height;
        const availableHeight = chartHeight - PADDING_Y * 2;
        const booksMap = {};
        booksForRender.forEach(b => { booksMap[b.name] = b; });

        // ==========================================
        // 🌟 核心引擎 1：生成虚拟 X 轴 (Virtual X-Axis)
        // ==========================================
        let virtualXAxis = [];
        
        if (mode === 'day') {
          let lastActiveIndex = -1;
          
          // 🌟 修复 1：过滤掉 'pause' 类型的纯占位节点，只有真正记了笔记的日期才算活跃！
          const activeIndices = new Set(
            nodes.filter(n => n.type !== 'pause').map(n => n.x)
          );
          
          // 为了方便测试，你可以把最顶部的 COLLAPSE_THRESHOLD 改为 1
          const COLLAPSE_THRESHOLD = 1; 
          
          for (let i = 0; i < rawXLabels.length; i++) {
            // 保留有笔记的日期，以及首尾两端的日期作为端点标尺
            if (activeIndices.has(i) || i === 0 || i === rawXLabels.length - 1) {
              
              // 检查之前积累的空白期是否达到折叠阈值
              if (lastActiveIndex !== -1 && (i - lastActiveIndex - 1) >= COLLAPSE_THRESHOLD) {
                // 触发折叠！插入一个特殊的折叠控制节点
                virtualXAxis.push({
                  type: 'collapse',
                  isCollapsed: true, // 默认处于折叠状态
                  label: '>···<',
                  startIndex: lastActiveIndex + 1,
                  endIndex: i - 1,
                  hiddenLabels: rawXLabels.slice(lastActiveIndex + 1, i).map((l, idx) => ({
                    originalIndex: lastActiveIndex + 1 + idx,
                    label: l
                  }))
                });
              } else if (lastActiveIndex !== -1) {
                // 间隔不够长（比如连更），正常插入日期
                for (let j = lastActiveIndex + 1; j < i; j++) {
                   virtualXAxis.push({ type: 'normal', originalIndex: j, label: rawXLabels[j] });
                }
              }
              
              // 插入当前这个有笔记的有效节点
              virtualXAxis.push({ type: 'normal', originalIndex: i, label: rawXLabels[i] });
              lastActiveIndex = i;
            }
          }
        } else {
           // 月/年模式：保持一对一映射
           virtualXAxis = rawXLabels.map((label, index) => ({ type: 'normal', originalIndex: index, label }));
        }

        // 🌟 修复 2：将布局依赖的原始数据缓存到 this，这是交互展开/收起能生效的关键！
        this.currentVirtualXAxis = virtualXAxis;
        this.cachedBooksMap = booksMap;
        this.cachedRawNodes = nodes;

        // 根据最终拍平的虚拟轴，计算画布布局
        this.buildLayoutAndRender(rect, PADDING_X, PADDING_Y, availableHeight, booksMap, nodes, mode);

      }).exec();
    }, 50);
  });
},

// ==========================================
  // 🌟 核心引擎 2：基于虚拟轴构建物理坐标系
  // ==========================================
  buildLayoutAndRender(rect, PADDING_X, PADDING_Y, availableHeight, booksMap, rawNodes, mode, isUpdate = false) {
    const virtualXAxis = this.currentVirtualXAxis;
    
    // 拍平虚拟轴，计算真正需要在屏幕上占位的“物理列数”
    let physicalColumns = [];
    virtualXAxis.forEach(col => {
      if (col.type === 'normal') {
        physicalColumns.push(col);
      } else if (col.type === 'collapse') {
        if (col.isCollapsed) {
          physicalColumns.push({ ...col, isDashedZone: true, _ref: col });
        } else {
          // 🌟 全新 UX：不再生成独立的收缩按钮
          // 直接把所有展开的日期标记为 expanded_item，并绑定 targetCollapse
          col.hiddenLabels.forEach(hl => {
             physicalColumns.push({ 
               type: 'expanded_item', 
               originalIndex: hl.originalIndex, 
               label: hl.label,
               targetCollapse: col // 核心：绑定父级折叠对象
             });
          });
        }
      }
    });

    const labelCount = physicalColumns.length;
    const dataWidth = labelCount * 60 + PADDING_X * 2;
    const finalCanvasWidth = Math.max(rect.width, dataWidth);

    const xMap = {};
    physicalColumns.forEach((col, physIndex) => {
      const px = (physIndex / Math.max(1, labelCount - 1)) * (finalCanvasWidth - PADDING_X * 2) + PADDING_X;
      if (col.originalIndex !== undefined) {
         xMap[col.originalIndex] = px;
      }
      col.px = px; 
    });

    // 映射节点物理坐标
    let renderPoints = [];
    let allPoints = [];
    let pausePoints = [];
    
    rawNodes.forEach((item) => {
      const px = xMap[item.x];
      if (px === undefined) return; 

      const bookTitle = item.bookTitle || '未分类';
      const bookCfg = booksMap[bookTitle];
      const py = bookCfg ? (PADDING_Y + bookCfg.y * availableHeight) : PADDING_Y;
      const color = bookCfg ? bookCfg.color : '#ccc';

      if (item.type !== 'pause') {
        renderPoints.push({ ...item, px, py, color, bookId: bookTitle, tag: item.tag, text: item.text });
        allPoints.push({ ...item, px, py, color, bookId: bookTitle, count: item.count || 1 });
      } else {
        pausePoints.push({ ...item, px, py, type: 'pause' });
      }
    });

    const groups = {};
    allPoints.forEach(p => {
      if (!groups[p.px]) groups[p.px] = [];
      groups[p.px].push(p);
    });

    const sortedX = Object.keys(groups).map(Number).sort((a, b) => a - b);
    let trajectoryPoints = [];
    let lastPoint = null;

    sortedX.forEach(px => {
      let group = groups[px].sort((a, b) => a.py - b.py);
      if (lastPoint) {
        const distToTop = Math.abs(lastPoint.py - group[0].py);
        const distToBottom = Math.abs(lastPoint.py - group[group.length - 1].py);
        if (distToBottom < distToTop) group = group.reverse();
      }
      trajectoryPoints = trajectoryPoints.concat(group);
      lastPoint = group[group.length - 1];
    });

    trajectoryPoints = trajectoryPoints.concat(pausePoints);

    this.trajectoryPoints = trajectoryPoints;
    const validCounts = trajectoryPoints.filter(p => p.type !== 'pause').map(p => p.count || 1);
    this.trajectoryConfig = {
      mode,
      labelCount,
      canvasWidth: finalCanvasWidth,
      paddingY: PADDING_Y,
      availableHeight,
      focused: this.data.focusedBookId,
      maxCount: validCounts.length ? Math.max(...validCounts) : 1,
      minCount: validCounts.length ? Math.min(...validCounts) : 1,
      clipLeft: PADDING_X,
      clipRight: finalCanvasWidth - PADDING_X,
      physicalColumns 
    };

    renderPoints = renderPoints.map(p => {
      let scale = 1;
      if (mode !== 'day' && this.trajectoryConfig.maxCount > this.trajectoryConfig.minCount) {
        const ratio = ((p.count || 1) - this.trajectoryConfig.minCount) / (this.trajectoryConfig.maxCount - this.trajectoryConfig.minCount);
        scale = 1 + ratio * 0.5;
      }
      return { ...p, scale };
    });

    const setDataPayload = {
      canvasWidthPx: finalCanvasWidth,
      renderPoints,
      virtualXAxis: physicalColumns 
    };

    if (!isUpdate) {
      const maxScrollLeft = finalCanvasWidth;
      this.scrollLeft = maxScrollLeft;
      setDataPayload.scrollLeftValue = maxScrollLeft;
    }
    
    this.setData(setDataPayload, () => {
      this.initCanvas();
    });
  },

  // ==========================================
  // 🌟 交互引擎：点击标签折叠/展开
  // ==========================================
  onToggleCollapse(e) {
    const colIndex = e.currentTarget.dataset.index;
    const clickedCol = this.data.virtualXAxis[colIndex];
    
    if (clickedCol.type === 'collapse') {
       // 展开操作
       clickedCol._ref.isCollapsed = false;
    } else if (clickedCol.type === 'expanded_item') {
       // 🌟 全新 UX：点击任意一个被展开的日期，都能瞬间收起整段区域
       clickedCol.targetCollapse.isCollapsed = true;
    } else {
      return;
    }

    // 触发微信自带的触感反馈（轻微震动），增强交互质感
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });

    const query = wx.createSelectorQuery();
    query.select('.chart-area').boundingClientRect((rect) => {
        if(!rect) return;
        const mode = this.data.currentMode;
        this.buildLayoutAndRender(rect, 40, 40, rect.height - 80, this.cachedBooksMap, this.cachedRawNodes, mode, true);
    }).exec();
  },

  // 初始化 Canvas：物理尺寸 = 可视区域宽度，缓存 node/ctx
  initCanvas() {
    const query = wx.createSelectorQuery();
    
    // 🌟 核心修复 1：同时查询 Canvas 节点，以及包裹气泡的 scroll-view 真实的滚动数据
    query.select('#trajectoryCanvas').fields({ node: true, size: true });
    query.select('.chart-scroll').scrollOffset(); 
    
    query.exec((res) => {
      if (!res[0] || !res[0].node) return;
      this.canvasNode = res[0].node;
      this.canvasCtx = this.canvasNode.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      this.canvasNode.width = res[0].width * dpr;
      this.canvasNode.height = res[0].height * dpr;
      this.canvasCtx.scale(dpr, dpr);
      this.canvasLogicWidth = res[0].width;
      this.canvasLogicHeight = res[0].height;

      // 🌟 核心修复 2：用 DOM 真实的 clamped 物理滚动值，强行覆盖 JS 的理论值
      if (res[1] && typeof res[1].scrollLeft === 'number') {
        this.scrollLeft = res[1].scrollLeft;
      }
      
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
    const { focused, physicalColumns } = cfg;
    if (points.length < 2) return;

    computeGlobalTangents(points);

    for (let i = 0; i < points.length - 1; i++) {
      const prev = points[i];
      const curr = points[i + 1];
      const isDimmed = focused && prev.bookId !== focused && curr.bookId !== focused;
      
      const ctrl = getControlPoints(prev, curr);

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

      // 🌟 核心：检测这根线是否横跨了“折叠区”
      // 如果 prev.px 和 curr.px 之间存在一个 physicalColumn 是 isDashedZone 的，开启虚线
      const hasDashedZone = physicalColumns.some(col => 
         col.isDashedZone && col.px > prev.px && col.px < curr.px
      );

      if (hasDashedZone) {
         ctx.setLineDash([6, 6]); // 设置虚线样式：6px 实线，6px 空白
         ctx.globalAlpha = isDimmed ? 0.1 : 0.4; // 折叠区的线更微弱通透
      } else {
         ctx.setLineDash([]); // 恢复实线
      }

      ctx.stroke();
      ctx.setLineDash([]); // 清理环境，防止影响后续绘制
    }
    ctx.globalAlpha = 1;
  },

  // 月/年模式：Catmull-Rom 平滑河流 + 分段渐变 + 纯正法向量等宽采样
  drawRiverPath(ctx, cfg) {
    const points = this.trajectoryPoints.filter(p => p.type !== 'pause');
    const { focused, maxCount, minCount } = cfg;
    if (points.length < 2) return;

    // 获取屏幕像素比，计算基础半径
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const rpxRatio = sys.windowWidth / 750;
    const baseRadiusPx = 12 * rpxRatio; 

    // 按变化幅度累乘计算绝对半宽
    const exaggeration = 1.2; 
    const nodeHalfWidths = [];

    const getInitialScale = (count) => {
      if (maxCount > minCount) {
        const ratio = ((count || 1) - minCount) / (maxCount - minCount);
        return 0.5 + ratio * 0.5;
      }
      return 0.7;
    };
    let currentHalfW = baseRadiusPx * getInitialScale(points[0].count);
    nodeHalfWidths.push(currentHalfW);

    for (let i = 1; i < points.length; i++) {
      const prevCount = points[i - 1].count || 1;
      const currCount = points[i].count || 1;
      const ratio = currCount / prevCount;
      const exaggeratedRatio = Math.pow(ratio, exaggeration);

      currentHalfW = currentHalfW * exaggeratedRatio;

      const minLimit = baseRadiusPx * 0.3; 
      const maxLimit = baseRadiusPx * 4.5; 
      currentHalfW = Math.max(minLimit, Math.min(currentHalfW, maxLimit));

      nodeHalfWidths.push(currentHalfW);
    }

    // 🌟 1. 调用提取的公共方法：计算全局切线
    computeGlobalTangents(points);

    // 分段绘制河流
    for (let i = 0; i < points.length - 1; i++) {
      const prev = points[i];
      const curr = points[i + 1];
      const isDimmed = focused && prev.bookId !== focused && curr.bookId !== focused;
      
      const prevHalfW = nodeHalfWidths[i];
      const currHalfW = nodeHalfWidths[i + 1];
      
      // 🌟 2. 调用提取的公共方法：获取控制点
      const ctrl = getControlPoints(prev, curr);

      const segGradient = ctx.createLinearGradient(prev.px, prev.py, curr.px, curr.py);
      segGradient.addColorStop(0, prev.color);
      segGradient.addColorStop(1, curr.color);

      // 高精度曲线采样计算绝对法向量
      const steps = 30; 
      const topPath = [];
      const bottomPath = [];

      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const u = 1 - t;
        const tt = t * t, uu = u * u;
        const uuu = uu * u, ttt = tt * t;

        const px = uuu * prev.px + 3 * uu * t * ctrl.cp1x + 3 * u * tt * ctrl.cp2x + ttt * curr.px;
        const py = uuu * prev.py + 3 * uu * t * ctrl.cp1y + 3 * u * tt * ctrl.cp2y + ttt * curr.py;

        const dx = 3 * uu * (ctrl.cp1x - prev.px) + 6 * u * t * (ctrl.cp2x - ctrl.cp1x) + 3 * tt * (curr.px - ctrl.cp2x);
        const dy = 3 * uu * (ctrl.cp1y - prev.py) + 6 * u * t * (ctrl.cp2y - ctrl.cp1y) + 3 * tt * (curr.py - ctrl.cp2y);

        let len = Math.hypot(dx, dy);
        let nx = 0, ny = 1; 
        if (len > 1e-5) {
          nx = -dy / len; 
          ny = dx / len;  
        }

        const w = prevHalfW + (currHalfW - prevHalfW) * t;

        topPath.push({ x: px + nx * w, y: py + ny * w });
        bottomPath.push({ x: px - nx * w, y: py - ny * w });
      }

      ctx.beginPath();
      ctx.moveTo(topPath[0].x, topPath[0].y);
      for (let j = 1; j <= steps; j++) ctx.lineTo(topPath[j].x, topPath[j].y);
      for (let j = steps; j >= 0; j--) ctx.lineTo(bottomPath[j].x, bottomPath[j].y); 
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
      const ctrl = getControlPoints(prev, curr); // 🌟 复用

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
