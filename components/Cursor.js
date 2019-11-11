import React from 'react';
import {View} from 'react-native';

/**
  模拟光标 组件
  <Cursor width={} height={} color={} blink={true} blinkTime={number} ref="b"/>
  refs.b.stop() / blink() / toggle() / setOffset(x, y)
 */
export default class Cursor extends React.PureComponent {
  static defaultProps={
    width:2,
    height:20,
    color:"black",
    blinkTime:1000
  }

  _show = true;
  _delay = null;
  _timer = null;
  _offset = {x:0, y:0};
  blinking = false;

  _setOpacity(show){
    this.refs.v.setNativeProps({
      opacity: show ? 1 : 0
    });
  }

  _update = () => {
    this._show = !this._show;
    this._setOpacity(this._show);
  }

  blink(){
    if (!this.blinking) {
      this.blinking = true;
      this._timer = setInterval(this._update, this._delay / 2);
    }
    return this;
  }

  stop(show){
    if (this.blinking) {
      this.blinking = false;
      clearInterval(this._timer);
      this._setOpacity(show);
    }
    return this;
  }

  toggle(){
    this.blinking ? this.stop() : this.blink();
    return this.blinking;
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

  componentDidMount(){
    this.blink();
  }

  componentWillUnmount(){
    this.stop();
  }

  render() {
    const {width, height, color, blinkTime, style} = this.props;
    if (this._delay !== blinkTime) {
      this._delay = blinkTime;
      if (this.blinking) {
        this.stop().blink();
      }
    }
    return <View pointerEvents="none" style={[style, {
      position:"absolute",
      width,
      height,
      backgroundColor:color
    }]} ref="v"/>
  }
}