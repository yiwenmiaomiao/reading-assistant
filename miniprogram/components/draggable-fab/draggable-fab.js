const STORAGE_KEY = 'draggable_fab_position';
const SIZE_RPX = 104;
const DEFAULT_RIGHT_RPX = 34;
const DEFAULT_BOTTOM_RPX = 128;
const TAP_DISTANCE = 8;

function getWindowInfo() {
  return wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
}

function rpxToPx(rpx, windowWidth) {
  return rpx * windowWidth / 750;
}

Component({
  data: {
    left: 0,
    top: 0,
    dragging: false
  },

  lifetimes: {
    attached() {
      this.registerInstance();
      this.initPosition();
    },

    detached() {
      this.unregisterInstance();
    }
  },

  pageLifetimes: {
    resize() {
      this.refreshBounds();
    }
  },

  methods: {
    registerInstance() {
      if (!wx.__draggableFabInstances__) {
        wx.__draggableFabInstances__ = [];
      }

      if (!wx.__draggableFabInstances__.includes(this)) {
        wx.__draggableFabInstances__.push(this);
      }
    },

    unregisterInstance() {
      const instances = wx.__draggableFabInstances__;
      if (!instances) return;
      wx.__draggableFabInstances__ = instances.filter((instance) => instance !== this);
    },

    initPosition() {
      const info = getWindowInfo();
      const size = rpxToPx(SIZE_RPX, info.windowWidth || 375);
      const defaultLeft = (info.windowWidth || 375) - rpxToPx(DEFAULT_RIGHT_RPX + SIZE_RPX, info.windowWidth || 375);
      const defaultTop = (info.windowHeight || 667) - rpxToPx(DEFAULT_BOTTOM_RPX + SIZE_RPX, info.windowWidth || 375);
      const position = this.getLatestPosition({ left: defaultLeft, top: defaultTop });

      this._size = size;
      this._windowWidth = info.windowWidth || 375;
      this._windowHeight = info.windowHeight || 667;
      this.setData(this.clampPosition(position.left, position.top));
    },

    getLatestPosition(defaultPosition) {
      const latest = wx.__draggableFabPosition__;
      if (latest && typeof latest.left === 'number' && typeof latest.top === 'number') {
        return latest;
      }

      const saved = wx.getStorageSync(STORAGE_KEY);
      if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
        wx.__draggableFabPosition__ = saved;
        return saved;
      }

      wx.__draggableFabPosition__ = defaultPosition;
      return defaultPosition;
    },

    refreshBounds() {
      const info = getWindowInfo();
      this._size = rpxToPx(SIZE_RPX, info.windowWidth || 375);
      this._windowWidth = info.windowWidth || 375;
      this._windowHeight = info.windowHeight || 667;
      this.setData(this.clampPosition(this.data.left, this.data.top));
    },

    ensureBounds() {
      if (this._size && this._windowWidth && this._windowHeight) {
        return;
      }

      const info = getWindowInfo();
      this._size = rpxToPx(SIZE_RPX, info.windowWidth || 375);
      this._windowWidth = info.windowWidth || 375;
      this._windowHeight = info.windowHeight || 667;
    },

    clampPosition(left, top) {
      this.ensureBounds();
      const maxLeft = Math.max(0, this._windowWidth - this._size);
      const maxTop = Math.max(0, this._windowHeight - this._size);

      return {
        left: Math.min(Math.max(0, left), maxLeft),
        top: Math.min(Math.max(0, top), maxTop)
      };
    },

    onTouchStart(event) {
      const touch = event.touches && event.touches[0];
      if (!touch) return;

      this._touchStartX = touch.clientX;
      this._touchStartY = touch.clientY;
      this._startLeft = this.data.left;
      this._startTop = this.data.top;
      this._hasMoved = false;
      this.setData({ dragging: true });
    },

    onTouchMove(event) {
      const touch = event.touches && event.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - this._touchStartX;
      const deltaY = touch.clientY - this._touchStartY;
      const next = this.clampPosition(this._startLeft + deltaX, this._startTop + deltaY);

      if (Math.abs(deltaX) > TAP_DISTANCE || Math.abs(deltaY) > TAP_DISTANCE) {
        this._hasMoved = true;
      }

      this.syncPosition(next, true);
    },

    onTouchEnd() {
      const { left, top } = this.data;
      const position = { left, top };
      wx.__draggableFabPosition__ = position;
      wx.setStorageSync(STORAGE_KEY, position);
      this.syncPosition(position, false);

      if (!this._hasMoved) {
        this.triggerEvent('tap');
      }
    },

    syncPosition(position, dragging) {
      const instances = wx.__draggableFabInstances__ || [this];
      wx.__draggableFabPosition__ = position;

      instances.forEach((instance) => {
        if (!instance || !instance.setData) return;
        const next = instance.clampPosition(position.left, position.top);
        instance.setData({
          ...next,
          dragging: instance === this ? dragging : false
        });
      });
    }
  }
});
