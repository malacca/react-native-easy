import {Image} from 'react-native';

const cache = new Map();

const loadImage = (source, resolve, reject) => {
  const local = typeof source === 'number';
  const {uri} = local ? {uri:source} : source;
  if (!uri) {
    return reject('URI ERROR');
  }
  let image = cache.get(uri);
  if (image) {
    return resolve(image, local);
  }
  if (local) {
    const src = Image.resolveAssetSource(source);
    const {width, height} = src;
    image = {width, height};
    cache.set(source, image);
    return resolve(image, local, src);
  }
  Image.getSize(uri,  (width, height) => {
    image = {width, height};
    cache.set(uri, image);
    return resolve(image, local);
  }, reject);
}

/**
  预加载图片 并 获取图片尺寸

  source: Image 组件支持的 source 格式, 如 {uri:""} , require('')

  imageSize(source).then(res => {
    res = {
      width: int,
      height: int,
      local: bool,
      src: Object, 该参数可用于 Android: Image.setNativeProps({src: src}) / iOS: Image.setNativeProps({source: src})
    }
  })
 */
export default imageSize = (source) => {
  return new Promise((resolve, reject) => loadImage(source, (image, local, src) => {
    image.local = local;
    image.src = src ? src : Image.resolveAssetSource(source);
    resolve(image);
  }, reject));
}

