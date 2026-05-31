function syncTabBar(page, index) {
  if (!page || typeof page.getTabBar !== 'function') {
    return;
  }

  let syncInstance = null;

  const update = (tabBar) => {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    if (pages[pages.length - 1] !== page) {
      return;
    }

    if (tabBar && typeof tabBar.syncSelected === 'function') {
      tabBar.syncSelected(index);
    }
  };

  try {
    syncInstance = page.getTabBar(update);
  } catch (error) {
    syncInstance = page.getTabBar();
  }

  update(syncInstance);
}

module.exports = {
  syncTabBar
};
