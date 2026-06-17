import config from '../../config/env.js';
const cloud = require('wx-server-sdk');
const axios = require('axios');
const FormData = require('form-data');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ！！！请替换为你自己的公众号配置 ！！！
const { APPID, APPSECRET } = config;

exports.main = async (event, context) => {
  // 微信要求该接口仅支持 jpg/png 格式
  const { base64Data, extension = 'jpg' } = event;

  try {
    // 1. 获取 token
    const tokenRes = await axios.get(`http://81.71.25.116:3000/get_token`, { timeout: 5000 });
    console.log('2. 中转站返回结果:', tokenRes.data);
    const accessToken = tokenRes.data.token;

    if (!accessToken) {
      return { success: false, error: 'Token获取失败: ' + JSON.stringify(tokenRes.data) };
    }

    // 2. Base64 转二进制 Buffer
    console.log('3. 准备转换图片 Buffer...');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 3. 构建表单数据
    const form = new FormData();
    form.append('media', buffer, {
      filename: `img_${Date.now()}.${extension}`,
      // 修正 Content-Type 匹配微信的要求
      contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`, 
    });

    // 4. 【核心修改】调用你找到的接口：上传图文消息内的图片（不限额度！）
    console.log('4. 开始向微信官方图床上传图片...');
    const uploadRes = await axios.post(`https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`, form, {
      headers: form.getHeaders(),
      timeout: 10000
    });

    console.log('5. 微信官方返回结果:', uploadRes.data);

    // 5. 提取并返回永久纯净链接
    // 该接口返回格式为 {"url":  "http://mmbiz.qpic.cn/mmbiz_jpg/..."}
    if (uploadRes.data && uploadRes.data.url) {
      return { success: true, url: uploadRes.data.url };
    } else {
      return { success: false, error: uploadRes.data };
    }
  } catch (err) {
    console.error('❌ 发生严重异常:', err.message);
    return { success: false, error: err.message };
  }
};