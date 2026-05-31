function getNavMetrics() {
  const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
  const statusBarHeight = info.statusBarHeight || 0;
  let navBarHeight = 44;

  if (wx.getMenuButtonBoundingClientRect) {
    const menu = wx.getMenuButtonBoundingClientRect();
    if (menu && menu.height) {
      navBarHeight = (menu.top - statusBarHeight) * 2 + menu.height;
    }
  }

  return {
    statusBarHeight,
    navBarHeight,
    totalHeight: statusBarHeight + navBarHeight
  };
}

module.exports = {
  getNavMetrics
};
