// config/env.js
const envVersion = __wxConfig.envVersion; // 小程序自带全局变量：develop, trial, release

const ENV_CONFIG = {
  develop: {
    APPID: 'wx0d121ddf29171051',
    APPSECRET: 'a9b149317ba88e3119fb4ff07713de54'
  },
  trial: {
    APPID: 'wx0d121ddf29171051',
    APPSECRET: 'a9b149317ba88e3119fb4ff07713de54'
  },
  release: {
    APPID: 'wx0d121ddf29171051',
    APPSECRET: 'a9b149317ba88e3119fb4ff07713de54'
  }
};

// 导出当前环境的配置
export default ENV_CONFIG[envVersion];