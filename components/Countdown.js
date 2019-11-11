import React from 'react';
import {Text} from 'react-native';

/**
  计数组件
  
  <Countdown 
    start={60}  // 启动数字
    end={0}     // 结束数字
    separator=":" // 时间分隔符
    text=""       // 自定义时间字符串 如 "计时：#time", #time 是显示时间的占位符
    onEnd={Function}  // 结束时 的 回调函数
    ...props        // 其他 Text 组件支持的属性
  />
 */
export default class Countdown extends React.PureComponent {
  state = {
    count: 0
  }

  static defaultProps={
    start:60,
    end:0,
    separator:':',
    text:null,
    onEnd:null,
  }
  _prevStart = null;
  _prevEnd = null;
  _prevMax = null;
  _decrement = true;

  _startCount = null;
  _startTime = 0;
  _timer = null;
  _ended = false;

  paused = true;

  _update = () => {
    let sub = Math.floor(
      (Date.now() - this._startTime) / 1000 
    );
    if (sub === 0) {
      return;
    }
    if (this._decrement) {
      sub = -sub;
    }
    const count = this._startCount + sub;
    this.setState({count});
    if (this._decrement ? count <= this._prevEnd : count >= this._prevEnd) {
      this.pause();
      this._ended = true;
      this.props.onEnd && this.props.onEnd();
    }
  }

  start = () => {
    if (this.paused) {
      this.paused = false;
      this._startTime = Date.now();
      if (this._startCount === null) {
        this._startCount = this._prevStart;
      } else {
        this._startCount = this.state.count;
      }
      this._timer = setInterval(this._update, 1000);
    }
    return this;
  }

  pause = () => {
    if (!this.paused) {
      this.paused = true;
      clearInterval(this._timer);
    }
    return this;
  }

  remain = () => {
    return this.state.count;
  }

  restart = () => {
    const {start, end} = this.props;
    this._restart(start, end, true);
  }

  _restart = (start, end, update) => {
    this._prevStart = start;
    this._prevEnd = end;
    this._prevMax = Math.max(start, end);
    this._decrement = end < start;
    this._startCount = null;
    if (update) {
      this.setState({count: start})
    }
    if (this._ended) {
      this._ended = false;
      this.start();
    } else if (!this.paused) {
      this.pause().start();
    }
  }

  componentDidMount(){
    this.start();
  }

  componentWillUnmount(){
    this.pause();
  }

  _parseTime(t) {
    return t > 9 ? t : '0' + t
  }

  _renderTime(count) {
    let time = '';

    // hour
    if (this._prevMax > 3600) {
      time = time + (
        count > 3600 ? this._parseTime( ~~(count / 3600) ) : '00'
      ) + this.props.separator;
    }

    // min
    if (this._prevMax > 60) {
      time = time + (
        count === 3600 ? '60' : (
          count > 60 ? this._parseTime( ~~( (count % 3600) / 60) ) : '00'
        )
      ) + this.props.separator;
    }

    // sec
    const sec = count > 60 ? count % 60 : count;
    time = time + (this._prevMax > 9 ? this._parseTime(sec) : sec);

    if (this.props.text) {
      return this.props.text.replace('#time', time);
    }
    return time;
  }

  render() {
    const {start, end, onEnd, ...props} = this.props;
    let count = this.state.count;
    // 重新设置了 start 或 end props, 那么就重新开始
    if (this._prevStart !== start || this._prevEnd !== end) {
      count = start;
      this._restart(start, end);
    }
    count = this._renderTime(count);
    return <Text {...props}>{count}</Text>;
  }
}