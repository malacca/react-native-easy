import {NativeModules}  from 'react-native';
const {Clipboard, RNCClipboard} = NativeModules;

/**
 * 复制文字
 * 支持 原生版 和 社区版 的原生端
 */
const msg = 'pls install @react-native-community/clipboard';
module.exports = {
  getString(){
    return RNCClipboard ? RNCClipboard.getString() : (
      Clipboard ? Clipboard.getString() : Promise.reject(msg)
    )
  },
  setString(content) {
    if (RNCClipboard) {
      RNCClipboard.setString(content);
    } else if (Clipboard) {
      Clipboard.setString(content);
    } else {
      throw msg
    }
  }
};