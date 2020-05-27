import {NativeModules, PermissionsAndroid, Linking, Alert}  from 'react-native';
import {dirs, external, fs, fetchPlus} from 'react-native-archives';

const IsAndroid = Platform.OS === 'android';
const {CameraRollManager, RNCCameraRoll} = NativeModules;

const {AppCaches} = external||{};
const CacheDir = AppCaches ? AppCaches : dirs.Caches;

const ERROR_DENIED = 'Permission_Denied';
const ERROR_CANCEl = 'Permission_Cancel';
const ERROR_ERROR = 'Permission_Error';
const ERROR_SETTING = 'Permission_Setting';
const VideoExt = ['mp4', 'mp3', 'm4v', 'mov', 'avi'];
const Luaguage = {
  reqSet: {
    title: '温馨提示',
    android: '保存失败，请将 权限->存储 设置为允许',
    ios: '需要您允许照片的读取和写入',
    set: '去设置',
    cancel: '取消保存'
  },
  reqPerms: {
    title: '温馨提示',
    message: '权限不足，请同意授权请求后继续保存',
    button: '知道了',
  },
  denied: '权限不足，保存失败',
  failed: '保存失败，请重试',
};

// 需依赖其他组件 实现的方法
const saveToGallery = (file, type) => {
  if (CameraRollManager) {
    return CameraRollManager.saveToCameraRoll('file://' + file, type)
  } else if (RNCCameraRoll) {
    return RNCCameraRoll.saveToCameraRoll(file, {type, album:''});
  } else {
    return Promise.reject(new Error('@react-native-community/cameraroll not found'));
  }
}
const downloadFile = (url, options, fileName) => {
  const saveTo = CacheDir + '/' + fileName;
  return fetchPlus(url, {
    ...options,
    saveTo
  }).then(res => {
    const {status} = res; 
    if (status !== 200) {
      throw new Error('download file response code:' + status);
    }
    return saveTo
  })
};
const writeBase64 = (fileName, base64) => {
  const saveTo = CacheDir + '/' + fileName;
  return fs.writeFile(saveTo, [base64]).then(r => {
    return saveTo
  });
}
const unlinkFile = (file) => {
  return fs.unlink(file).catch((err) => {
    return false;
  });
}

// 保存操作
const permissionDeniedMsg = (err) => {
  const tp = typeof err;
  const errMsg = tp === 'string' ? err : (
    tp === 'object' && 'message' in err ? err.message : null
  );
  if (!errMsg) {
    return null;
  }
  const lowerMsg = errMsg.toLowerCase();
  return lowerMsg.indexOf('permission') > -1 || 
    (lowerMsg.indexOf('access') > -1 && lowerMsg.indexOf('denied') > -1)
    ? errMsg : null;
}

const parseUrl = (url) => {
  let scheme = null, ext = null, source = url;
  if (url.startsWith('data:')) {
    const start = url.indexOf('/'), end = url.indexOf(';base64,');
    if (start && end) {
      scheme = 'data';
      ext = url.substring(start+1, end);
      source = url.substring(end + 8);
    }
  } else {
    if (url.startsWith('/')) {
      scheme = 'file';
      source = 'file://' + url;
    } else {
      scheme = url.startsWith('http') ? 'http' : (
        url.startsWith('file://') ? 'file' : null
      );
    }
    if (scheme !== null) {
      const paths = source.split('/');
      if (paths.length > 3) {
        const filename = paths.pop().split('?')[0];
        if (filename.indexOf('.') > -1) {
          ext = filename.split('.').pop()
        }
      }
    }
  }
  return {scheme, ext, source};
}

const errorPromise = (e) => {
  let err;
  if (e instanceof Error) {
    err = e;
  } else if (typeof e === 'string') {
    err = new Error(e);
  } else {
    const {message} = e||{};
    err = new Error(message||'unknown error');
    err.native = e;
  }
  return Promise.reject(err)
}

const requestSetting = () => {
  const luag = Luaguage.reqSet;
  const msg = IsAndroid ? luag.android : luag.ios;
  return new Promise((resolve, reject) => {
    Alert.alert(luag.title, msg, [
      {text: luag.cancel, onPress: () => {
        reject(new Error(ERROR_CANCEl))
      }},
      {text: luag.set, onPress: () => {
        Linking.openSettings().then(r => {
          reject(new Error(r ? ERROR_SETTING : ERROR_ERROR))
        }).catch(err => {
          reject(new Error(ERROR_ERROR))
        })
      }, style: 'destructive'},
    ], {cancelable: false})
  })
}

const requestPermission = (file) => {
  try {
    const perm = Luaguage.reqPerms;
    return PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
      title: perm.title,
      message: perm.message,
      buttonPositive: perm.button,
    }).then(res => {
      if (res === PermissionsAndroid.RESULTS.DENIED) {
        throw new Error(ERROR_DENIED);
      }
      return res === PermissionsAndroid.RESULTS.GRANTED ? saveFileToGallery(file) : requestSetting();
    });
  } catch (e) {
    return errorPromise(e);
  }
}

const saveFileToGallery = (file) => {
  const {type, source} = file;
  return saveToGallery(source, type).then(dest => {
    delete file.source;
    file.dest = dest;
    return file;
  }).catch(err => {
    if (!permissionDeniedMsg(err)) {
      throw err;
    }
    return IsAndroid ? requestPermission(file) : requestSetting();
  })
}

const saveCacheToGallery = (file) => {
  const {source} = file;
  return saveFileToGallery(file).then(r => {
    unlinkFile(source)
    return r;
  }).catch(err => {
    unlinkFile(source)
    throw err;
  })
}

const saveFileFromUrl = (options, type) => {
  try {
    const {fromUrl, saveName, saveExt, ...props} = options;
    const fileName = saveName + (saveExt ? '.' + saveExt : '');
    return downloadFile(fromUrl, props, fileName).then(savePath => {
      return saveCacheToGallery({type, saveName, saveExt, source:savePath})
    });
  } catch(e) {
    return errorPromise(e);
  }
}

const saveFileFromBase64 = (base64, options, type) => {
  const {saveName, saveExt, fromUrl} = options;
  if (!IsAndroid) {
    return saveFileToGallery({type, saveName, saveExt, source:base64})
  }
  try {
    const {saveName, saveExt, ...props} = options;
    const fileName = saveName + (saveExt ? '.' + saveExt : '');
    return writeBase64(fileName, fromUrl).then(savePath => {
      return saveCacheToGallery({type, saveName, saveExt, source:savePath})
    });
  } catch(e) {
    return errorPromise(e);
  }
}

const saveFileWithType = (fromUrl, options, type) => {
  const url = parseUrl(fromUrl);
  if (url.scheme === null) {
    return Promise.reject(new Error('source url error'));
  }
  let {saveName, saveExt, ...props} = options||{};
  if (!saveName) {
    saveName = new Date().getTime();
  }
  if (!saveExt && url.ext) {
    saveExt = url.ext;
  }
  if (saveExt && type === 'auto') {
    type = VideoExt.includes(saveExt.toLowerCase()) ? 'video' : 'photo';
  } else if (!saveExt && type !== 'auto') {
    saveExt = type === 'video' ? 'mp4' : 'jpg';
  }
  if (url.scheme === 'data' && type === 'video') {
    return Promise.reject(new Error('save video not support base64 url'));
  }
  props.fromUrl = url.source;
  props.saveName = saveName;
  props.saveExt = saveExt;
  if (url.scheme === 'http') {
    return saveFileFromUrl(props, type);
  } else if (url.scheme === 'data') {
    return saveFileFromBase64(fromUrl, props, type);
  }
  return saveFileToGallery({type, saveName, saveExt, source:url.source})
}

const saveFileCommon = (url, options, handle, type) => {
  if (handle === undefined && (options === true || options === false)) {
    options = {};
    handle = options;
  }
  return saveFileWithType(url, options, type).catch(error => {
    const msg = permissionDeniedMsg(error) ? (
      msg === ERROR_SETTING || msg === ERROR_CANCEl ? null : Luaguage.denied
    ) : Luaguage.failed;
    if (handle) {
      throw {
        error,
        msg
      };
    }
    if (msg) {
      Alert.alert(msg);
    }
    return error;
  })
}
/**
 保存文件到相册, 自动处理权限问题, 会先下载到 CacheDir -> 转存到相册 -> 删除临时文件
 0. 依赖 react-native-archives 下载文件
    默认使用 rn 自带的 CameraRollManager 保存, 但该组件官方已提醒会在未来移除
    如已移除, 安装 @react-native-community/cameraroll 组件 来进行兼容

 1. url 可以是 本地文件[file:///data/ || /data/] 远程文件[https://]  对于图片还支持 Base64[data:]
 2. options 可设置 {saveName:String, saveExt:String} 
      saveName: 默认为时间戳
      saveExt:  默认从 url 中提取, 若 url 中不含文件后缀, 则建议手动设置, 否则将自动 photo(jpg) / video(mp4) / auto(none)
    对于 url 为远程文件的, options 还可额外设置 react-native-archives fetchPlus options, 请查询其文档(如更改临时保存路径/监听下载进度)

 3. 可直接 saveFile(url, (Bool)handler) 代表不使用 options
 4. handle:Bool  是否手动处理错误消息, 默认为 false, 若手动处理, 对于返回的 promise 需手动 catch
 5. handle=false then() 参数在保存成功的情况下为 {type, saveName, saveExt, dest}, 失败的情况下为 Error
*/
const Gallery =  {
  saveFile: (url, options, handle) => {
    return saveFileCommon(url, options, handle, 'auto')
  },
  saveImage:(url, options, handle) => {
    return saveFileCommon(url, options, handle, 'photo')
  },
  saveVideo:(url, options, handle) => {
    return saveFileCommon(url, options, handle, 'video')
  },
  setLang(lang){
    const {reqSet, reqPerms, denied, failed} = lang;
    if (reqSet) {
      Luaguage.reqSet = {...Luaguage.reqSet, ...reqSet}
    }
    if (reqPerms) {
      Luaguage.reqPerms = {...Luaguage.reqPerms, ...reqPerms}
    }
    if (denied) {
      Luaguage.denied = denied;
    }
    if (failed) {
      Luaguage.failed = failed;
    }
    return Gallery;
  }
};

module.exports = Gallery;