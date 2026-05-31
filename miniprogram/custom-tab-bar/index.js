function getSliderStyle(index) {
  return `transform: translate3d(${index * 100}%, 0, 0);`;
}

const TRANSITION_DURATION = 280;
const LOGO_ACTIVATE_DELAY = TRANSITION_DURATION + 18;
const TAB_BAR_GAP_RPX = 80;

const tabList = [
  { pagePath: "/pages/index/index", iconClass: "icon-home", text: "首页" },
  { pagePath: "/pages/notes/notes", iconClass: "icon-book", text: "笔记" },
  { pagePath: "/pages/profile/profile", iconClass: "icon-user", text: "我的" }
];

function getActiveTabIndex() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  const currentPage = pages[pages.length - 1];
  const currentPath = currentPage && currentPage.route ? `/${currentPage.route}` : '';
  const index = tabList.findIndex((item) => item.pagePath === currentPath);

  if (index >= 0) {
    return index;
  }

  return typeof wx.__latestSelectedTab__ === 'number' ? wx.__latestSelectedTab__ : 0;
}

function getWindowWidth() {
  const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
  return info.windowWidth || 375;
}

function getTabWidth() {
  const windowWidth = getWindowWidth();
  const gap = TAB_BAR_GAP_RPX * windowWidth / 750;
  return (windowWidth - gap) / tabList.length;
}

function getWorkletTranslateX(index) {
  return getTabWidth() * index;
}

function recordTabTransition(from, to) {
  wx.__tabBarTransition__ = {
    from,
    to,
    time: Date.now(),
    consumed: false
  };
}

Component({
  data: {
    selected: 0,
    activeIndex: 0,
    sliderStyle: getSliderStyle(0),
    animating: false,
    list: tabList
  },

  lifetimes: {
    created() {
      this.initWorkletValues();
    },

    attached() {
      this.syncSelected(getActiveTabIndex());
    },

    detached() {
      clearTimeout(this._motionTimer);
      clearTimeout(this._deactivateTimer);
      clearTimeout(this._activateTimer);
    }
  },

  methods: {
    initWorkletValues() {
      const worklet = wx.worklet || {};

      if (!worklet.shared || !worklet.timing) {
        this._workletEnabled = false;
        return;
      }

      this._workletEnabled = true;
      this._tabWidth = worklet.shared(getTabWidth());
      this._translateX = worklet.shared(0);
      this._scaleX = worklet.shared(1);
    },

    applyIndicatorStyle() {
      if (
        this._workletReady ||
        !this._workletEnabled ||
        !this._translateX ||
        typeof this.applyAnimatedStyle !== 'function'
      ) {
        return;
      }

      this.applyAnimatedStyle('.slider-indicator', () => {
        'worklet';
        return {
          transform: `translateX(${this._translateX.value}px) scaleX(${this._scaleX.value})`
        };
      });
      this._workletReady = true;
    },

    normalizeIndex(index) {
      const value = Number(index);
      return value >= 0 && value < tabList.length ? value : 0;
    },

    consumeTransition(to) {
      const transition = wx.__tabBarTransition__;

      if (
        !transition ||
        transition.consumed ||
        transition.to !== to ||
        transition.from === transition.to ||
        Date.now() - transition.time > 1200
      ) {
        return null;
      }

      transition.consumed = true;
      return this.normalizeIndex(transition.from);
    },

    updateWorkletMetrics() {
      if (this._tabWidth) {
        this._tabWidth.value = getTabWidth();
      }
    },

    snapWorkletTo(index) {
      if (!this._translateX) return;
      this._workletAnimatingUntil = 0;
      this.updateWorkletMetrics();
      this._translateX.value = getWorkletTranslateX(index);
      this._scaleX.value = 1;
    },

    animateWorkletTo(index, from) {
      if (!this._translateX || !wx.worklet || !wx.worklet.timing) {
        return false;
      }

      const { Easing, timing } = wx.worklet;
      const easing = this.getAccelerationEasing(Easing);
      const timingOptions = {
        duration: TRANSITION_DURATION
      };
      const distance = Math.abs(index - this.normalizeIndex(from));

      if (easing) {
        timingOptions.easing = easing;
      }

      this.updateWorkletMetrics();
      this._translateX.value = timing(getWorkletTranslateX(index), timingOptions);
      this._scaleX.value = Math.min(1.18, 1 + distance * 0.08);
      this._scaleX.value = timing(1, timingOptions);
      this._workletAnimatingUntil = Date.now() + TRANSITION_DURATION + 80;

      return true;
    },

    getAccelerationEasing(Easing) {
      if (!Easing) return undefined;

      if (Easing.bezier) {
        return Easing.bezier(0.55, 0, 1, 1);
      }

      if (Easing.in && Easing.cubic) {
        return Easing.in(Easing.cubic);
      }

      return Easing.ease;
    },

    getLogoDeactivateDelay(from, to) {
      const distance = Math.abs(this.normalizeIndex(to) - this.normalizeIndex(from));
      return distance > 1 ? 115 : 175;
    },

    updateActiveIndex(index, animated, from) {
      clearTimeout(this._deactivateTimer);
      clearTimeout(this._activateTimer);

      if (!animated) {
        this.setData({ activeIndex: index });
        return;
      }

      const previous = this.normalizeIndex(from);
      this.setData({ activeIndex: previous });

      this._deactivateTimer = setTimeout(() => {
        this.setData({ activeIndex: -1 });
      }, this.getLogoDeactivateDelay(previous, index));

      this._activateTimer = setTimeout(() => {
        this.setData({ activeIndex: index });
      }, LOGO_ACTIVATE_DELAY);
    },

    setSelectedData(index, animating, from) {
      clearTimeout(this._motionTimer);
      wx.__latestSelectedTab__ = index;

      const nextData = {
        selected: index,
        animating: !this._workletReady && animating
      };

      if (!this._workletReady) {
        nextData.sliderStyle = getSliderStyle(index);
      }

      this.setData(nextData);
      this.updateActiveIndex(index, animating, from);

      if (!this._workletReady && animating) {
        this._motionTimer = setTimeout(() => {
          this.setData({ animating: false });
        }, TRANSITION_DURATION + 40);
      }
    },

    updateSelected(index, options) {
      const selected = this.normalizeIndex(index);
      const config = options || {};
      const pendingFrom = config.usePending === false ? null : this.consumeTransition(selected);
      const from = pendingFrom === null ? this.normalizeIndex(config.from) : pendingFrom;
      const shouldAnimate = !!config.animated || pendingFrom !== null;

      this.applyIndicatorStyle();

      const canAnimateWithWorklet = this._workletEnabled && this._workletReady && shouldAnimate && from !== selected;

      if (
        selected === this.data.selected &&
        (!this._workletReady || pendingFrom === null) &&
        !this.data.animating
      ) {
        wx.__latestSelectedTab__ = selected;
        if (this._workletAnimatingUntil && Date.now() < this._workletAnimatingUntil) {
          return;
        }
        if (this._workletReady) {
          this.snapWorkletTo(selected);
        }
        return;
      }

      if (this._workletReady) {
        if (canAnimateWithWorklet) {
          this.snapWorkletTo(from);
        } else {
          this.snapWorkletTo(selected);
        }
      }

      this.setSelectedData(selected, shouldAnimate, from);

      if (canAnimateWithWorklet) {
        this.animateWorkletTo(selected, from);
      }
    },

    syncSelected(index) {
      this.updateSelected(index, { animated: false });
    },

    moveSlider(index) {
      const selected = this.normalizeIndex(index);

      if (selected === this.data.selected) {
        this.syncSelected(selected);
        return;
      }

      this.updateSelected(selected, {
        animated: true,
        from: this.data.selected,
        usePending: false
      });
    },

    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      const selected = this.normalizeIndex(index);

      if (this.data.selected === selected) {
        this.syncSelected(selected);
        return;
      }

      recordTabTransition(this.data.selected, selected);
      this.moveSlider(selected);
      wx.switchTab({
        url: path,
        fail: () => {
          wx.__tabBarTransition__ = null;
          this.syncSelected(getActiveTabIndex());
        }
      });
    },

    goCreate() {
      wx.navigateTo({
        url: '/pages/note-edit/note-edit'
      });
    }
  }
});
