const cloud = require('wx-server-sdk');
const axios = require('axios');
const FormData = require('form-data');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// ！！！填入你的公众号信息 ！！！
const { APPID, APPSECRET } = config;

exports.main = async (event, context) => {
  try {
    // 1. 获取公众号 Token
    const tokenRes = await axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
    
    // 【修改点】：直接捕获并返回微信的具体错误码和报错信息
    if (tokenRes.data && tokenRes.data.errcode) {
      return { 
        success: false, 
        error: `Token 获取被微信拒绝！错误码: ${tokenRes.data.errcode}, 详情: ${tokenRes.data.errmsg}` 
      };
    }

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) return { success: false, error: 'Token 返回为空' };

    // 2. 查找 Users 集合中所有仍在使用 cloud:// 头像的用户
    const usersRes = await db.collection('users').where({
      avatar: db.RegExp({ regexp: '^cloud://', options: 'i' })
    }).get();

    let successCount = 0;
    const errors = [];

    // 3. 遍历迁移
    for (let user of usersRes.data) {
      try {
        const downloadRes = await cloud.downloadFile({ fileID: user.avatar });
        const buffer = downloadRes.fileContent;

        const form = new FormData();
        form.append('media', buffer, { filename: 'avatar.jpg', contentType: 'image/jpeg' });

        const uploadRes = await axios.post(`https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`, form, {
          headers: form.getHeaders()
        });

        if (uploadRes.data && uploadRes.data.url) {
          const newUrl = uploadRes.data.url.replace(/^http:\/\//i, 'https://');

          await db.collection('users').doc(user._id).update({
            data: { avatar: newUrl }
          });

          await db.collection('notes').where({ 
            _openid: user._openid 
          }).update({
            data: { 
              authorAvatar: newUrl,
              'author.avatar': newUrl 
            }
          });

          successCount++;
        } else {
          errors.push(`用户 ${user.nickname} 图片上传失败: ${JSON.stringify(uploadRes.data)}`);
        }
      } catch (err) {
        errors.push(`用户 ${user.nickname} 迁移异常: ${err.message}`);
      }
    }

    return { 
      success: true, 
      message: `迁移完成，成功处理 ${successCount} 个用户`, 
      errors 
    };

  } catch (globalErr) {
    return { success: false, error: globalErr.message };
  }
};