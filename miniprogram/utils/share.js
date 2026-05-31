const SHARE_TITLE = '书笔记';
const SHARE_PATH = '/pages/index/index';
const SHARE_QUERY = '';

function enableShareMenu() {
  if (typeof wx.showShareMenu !== 'function') {
    return;
  }

  wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  });
}

function getShareAppMessage() {
  return {
    title: SHARE_TITLE,
    path: SHARE_PATH
  };
}

function getShareTimeline() {
  return {
    title: SHARE_TITLE,
    query: SHARE_QUERY
  };
}

module.exports = {
  enableShareMenu,
  getShareAppMessage,
  getShareTimeline
};
