import React from 'react';
import imageSize from './../utils/imageSize';
import {Platform, Animated, Image} from 'react-native';

/**
  图片组件, 使用方式与原生 Image 完全一样
    只是会自动将图片宽度设置为父级宽度, 高度自动
    
  <AutoImage sourc={} ../>
 */
export default class AutoImage extends React.PureComponent {
  setNativeProps(props: Object) {
    const ImageRef = this.ImageRef;
    if (ImageRef) {
      ImageRef.setNativeProps(props);
    }
  }
  _trigger = (event, error) => {
    if (this._onInit) {
      this._onInit(error ? {error:true, msg:event} : {...event, error: false});
    }
  };
  _update = () => {
    if (!this._width || !this._img) {
      return;
    }
    const height = this._width * (this._img.height / this._img.width);
    const props = {
      style: {width:this._width, height},
    };
    if (Platform.OS === 'android') {
      props.src = [this._img.src];
    } else {
      props.source = [this._img.src];
    }
    this.ImageRef.setNativeProps(props);
    this._trigger(this._img, false);
  };
  _loadImage = () => {
    imageSize(this._source).then(res => {
      this._img = res;
      this._update();
    }).catch((err) => {
      this._trigger(err, true);
    });
  };
  _layout = (e) => {
    const {width} = e.nativeEvent.layout;
    this._width = width;
    this._update();
  };
  render(){
    const {source, onInit, animated, ...props} = this.props;
    this._src = null;
    this._img = null;
    this._width = null;
    this._source = source;
    this._onInit = onInit;
    this._loadImage();
    props.onLayout = this._layout;
    props.ref = ref => this.ImageRef = ref
    if (animated) {
      return <Animated.Image {...props}/>;
    }
    return <Image {...props}/>;
  }
}