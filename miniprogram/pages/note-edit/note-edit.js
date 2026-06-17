const store = require('../../utils/store');
const layout = require('../../utils/layout');
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share');

Page({
  data: {
    navHeight: 88,
    id: '',
    bookTitle: '',
    content: '',
    reflection: '',
    images: [],
    selectedTags: [],
    tags: [],
    customTag: '',
    checkinDate: ''
  },

  

  async onLoad(query) {
    enableShareMenu();
    this.setData({
      navHeight: layout.getNavMetrics().totalHeight
    });
    const id = query.id || '';
    const checkinDate = query.checkinDate || '';
    this.setData({ checkinDate: id ? '' : checkinDate });
    if (id) {
      const note = await store.getNoteAsync(id);
      if (note) {
        this.setData({
          id,
          bookTitle: note.bookTitle,
          content: note.content,
          reflection: note.reflection,
          images: note.images,
          selectedTags: note.tags
        });
      }
    }
    this.refreshTags();
  },

  async refreshTags() {
    const selected = this.data.selectedTags;
    const tags = await store.getTagsAsync();
    this.setData({
      tags: tags.map((tag) => ({
        ...tag,
        selected: selected.includes(tag.name)
      }))
    });
  },

  onBookInput(event) {
    this.setData({ bookTitle: event.detail.value });
  },

  onContentInput(event) {
    this.setData({ content: event.detail.value });
  },

  onReflectionInput(event) {
    this.setData({ reflection: event.detail.value });
  },

  onCustomTagInput(event) {
    this.setData({ customTag: event.detail.value });
  },

  toggleTag(event) {
    const name = event.currentTarget.dataset.name;
    const selected = this.data.selectedTags.slice();
    const index = selected.indexOf(name);
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(name);
    }
    this.setData({ selectedTags: selected });
    this.refreshTags();
  },

  async addCustomTag() {
    const tag = this.data.customTag.trim();
    if (!tag) return;
    const createdTag = await store.createTagAsync(tag);
    const tagName = createdTag ? createdTag.name : tag;
    const selected = this.data.selectedTags.includes(tagName) ? this.data.selectedTags : this.data.selectedTags.concat(tagName);
    this.setData({
      selectedTags: selected,
      customTag: ''
    });
    this.refreshTags();
    wx.showToast({ title: '标签已添加', icon: 'success' });
  },

  chooseImages() {
    const remain = 9 - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多 9 张图片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const oversize = res.tempFiles.some((file) => file.size > 10 * 1024 * 1024);
        if (oversize) {
          wx.showToast({ title: '单张图片不能超过 10MB', icon: 'none' });
          return;
        }
        this.setData({
          images: this.data.images.concat(res.tempFiles.map((file) => file.tempFilePath)).slice(0, 9)
        });
      }
    });
  },

  removeImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const images = this.data.images.slice();
    images.splice(index, 1);
    this.setData({ images });
  },

  previewImage(event) {
    wx.previewImage({
      current: event.currentTarget.dataset.src,
      urls: this.data.images
    });
  },

  async submit() {
    const bookTitle = this.data.bookTitle.trim();
    const content = this.data.content.trim();
    // 1. 独立校验书名
    if (!bookTitle) {
      wx.showToast({ title: '请输入书名', icon: 'none' });
      return;
    }

    // 2. 独立校验正文
    if (!content) {
      wx.showToast({ title: '请输入笔记正文', icon: 'none' });
      return;
    }

    // 3. 校验正文字数上限
    if (content.length > 5000) {
      wx.showToast({ title: '正文最多 5000 字', icon: 'none' });
      return;
    }
    
    try {
      wx.showLoading({ title: '保存中...' });
      await store.saveNoteAsync({
        _id: this.data.id,
        bookTitle,
        content,
        reflection: this.data.reflection.trim(),
        tags: this.data.selectedTags,
        images: this.data.images,
        checkinDate: this.data.checkinDate
      });
      wx.hideLoading();
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/index/index' });
        }
      }, 350);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      console.warn('save note failed', error);
    }
  },

  deleteNote() {
    if (!this.data.id) return;
    wx.showModal({
      title: '删除笔记',
      content: '删除后不会在列表和统计中展示，确定删除吗？',
      confirmText: '删除',
      confirmColor: '#D14343',
      success: async (res) => {
        if (res.confirm) {
          await store.deleteNoteAsync(this.data.id);
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 350);
        }
      }
    });
  },

  onShareAppMessage() {
    return getShareAppMessage();
  },

  onShareTimeline() {
    return getShareTimeline();
  }
});
