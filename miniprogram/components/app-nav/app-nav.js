const layout = require('../../utils/layout');

Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    canBack: {
      type: Boolean,
      value: false
    },
    variant: {
      type: String,
      value: 'solid',
      observer(value) {
        this.setData({
          variantClass: value === 'transparent' ? 'nav-transparent' : ''
        });
      }
    }
  },

  data: {
    statusBarHeight: 0,
    navBarHeight: 44,
    totalHeight: 88,
    variantClass: ''
  },

  lifetimes: {
    attached() {
      this.setData({
        ...layout.getNavMetrics(),
        variantClass: this.properties.variant === 'transparent' ? 'nav-transparent' : ''
      });
    }
  },

  methods: {
    goBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
        return;
      }
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  }
});
