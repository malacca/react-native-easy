import React from 'react';
import {View} from 'react-native';

/**
  模拟光标 组件
  <Cursor 
    width={2} 
    height={20} 
    color="black"
    blink={true} 
    rate={500}
    ref="b"
  />
  refs.b.stop() / blink() / toggle() / setOffset(x, y)
 */
export default class Cursor extends React.PureComponent {
  static defaultProps={
    width:2,
    height:20,
    color:"black",
    blink:true,
    rate:500,
  }
  _timer = null;
  _show = true;
  _offset = {x:0, y:0};

  componentDidMount(){
    if (this.props.blink) {
      this.blink();
    }
  }
  componentDidUpdate(prevProps){
    const {blink, rate} = this.props;
    if (prevProps.blink !== blink || prevProps.rate !== rate) {
      if (this._timer) {
        this.stop();
      }
      if (blink) {
        this.blink();
      }
    }
  }
  componentWillUnmount(){
    this._clearTimer();
  }
  _clearTimer = () => {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  blink(){
    if (!this._timer) {
      this._timer = setInterval(this._update, this.props.rate);
    }
    return this;
  }
  stop(show){
    this._clearTimer();
    this._setOpacity(show);
    return this;
  }
  toggle(){
    const blinking = Boolean(this._timer);
    blinking ? this.stop() : this.blink();
    return blinking;
  }

  setOffset(x, y){
    x = x === undefined || x === null ? this._offset.x : x;
    y = y === undefined || y === null ? this._offset.y : y;
    this._offset = {x, y};
    this.refs.v.setNativeProps({
      style: {transform: [
        {translateX: x},
        {translateY: y}
      ]}
    });
    return this;
  }

  _update = () => {
    this._show = !this._show;
    this._setOpacity(this._show);
  }
  _setOpacity(show){
    this.refs.v.setNativeProps({
      opacity: show ? 1 : 0
    });
  }

  render() {
    const {width, height, color, style} = this.props;
    return <View pointerEvents="none" style={[style, {
      position:"absolute",
      width,
      height,
      backgroundColor:color,
      opacity:0,
    }]} ref="v"/>
  }
}