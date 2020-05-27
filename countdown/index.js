import React from 'react';
import {Text} from 'react-native';
import {getInt} from './../utils/helper';

/**
  计数组件
  
  <Countdown 
    start={60}     // 启动数字
    end={0}        // 结束数字
    separator=":"  // 时间分隔符 
    text=""        // 自定义时间字符串 如 "计时：#time",  其中 #time 是显示时间的占位符
    timeStyle={}   // 若使用自定义字符串, 可单独为时间字符串设置样式, 比如高亮
    onEnd={Function}  // 结束时 的 回调函数
    ...props        // 其他 Text 组件支持的属性, 比如 style
  />
*/
export default class Countdown extends React.PureComponent {

  static defaultProps={
    start:60,
    end:0,
    separator:':',
    text:null,
    onEnd:null,
  }
  _decrement = true;
  _maxCount = null;

  _startTime = 0;
  _startCount = null;
  _timer = null;
  _paused = true;
  _ended = false;

  constructor(props) {
    super(props);
    this.state = {
      count: props.start
    }
  }

  componentDidMount(){
    const {start, end} = this.props;
    this._restart(start, end);
  }

  componentDidUpdate(prevProps){
    const {start, end} = this.props;
    if (start !== prevProps.start || end !== prevProps.end) {
      this._restart(start, end, true);
    }
  }

  componentWillUnmount(){
    this.pause();
  }

  remain = () => {
    return this.state.count;
  }

  isPaused = () => {
    return this._paused;
  }

  toggle = () => {
    return this._paused ? this.start() : this.pause();
  }

  restart = () => {
    const {start, end} = this.props;
    return this._restart(start, end, true);
  }

  _restart = (start, end, update) => {
    this.pause();
    if (getInt(start, null) === null || getInt(end, null) === null) {
      this._maxCount = null;
    } else {
      this._maxCount = Math.max(start, end);
      this._decrement = end < start;
    }
    if (this._ended) {
      this._ended = false;
    }
    if (update) {
      this.setState({count: start}, this.start)
    } else {
      this.start();
    }
    return this;
  }

  pause = () => {
    if (!this._paused) {
      this._paused = true;
      clearInterval(this._timer);
    }
    return this;
  }

  start = () => {
    if (!this._paused || this._maxCount === null) {
      return this;
    }
    this._paused = false;
    this._startTime = Date.now();
    this._startCount = this.state.count;
    this._timer = setInterval(this._update, 1000);
    return this;
  }

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
    if (this._decrement ? count <= this.props.end : count >= this.props.end) {
      this.pause();
      this._ended = true;
      this.props.onEnd && this.props.onEnd();
    }
  }

  _renderTime(count) {
    if (this._maxCount === null) {
      return null;
    }
    const {separator} = this.props;

    let time = '';
    // hour
    if (this._maxCount > 3600) {
      time = time + (
        count > 3600 ? this._parseTime( ~~(count / 3600) ) : '00'
      ) + separator;
    }

    // min
    if (this._maxCount > 60) {
      time = time + (
        count === 3600 ? '60' : (
          count > 60 ? this._parseTime( ~~( (count % 3600) / 60) ) : '00'
        )
      ) + separator;
    }

    // sec
    const sec = count > 60 ? count % 60 : count;
    time = time + (this._maxCount > 9 ? this._parseTime(sec) : sec);

    return time;
  }
  
  _parseTime(t) {
    return t > 9 ? t : '0' + t
  }

  render() {
    const {text, timeStyle, ...props} = this.props;
    const time = this._renderTime(this.state.count)
    if (text && timeStyle) {
      let prev = null, next = null;
      const index = text.indexOf('#time');
      if (index > -1) {
        prev = text.substring(0, index);
        next = text.substring(index + 5);
      } else {
        prev = text;
      }
      return <Text {...props}>
        {prev}
        <Text style={timeStyle}>{time}</Text>
        {next}
      </Text>
    }
    return <Text {...props}>
      {text ? text.replace('#time', time) : time}
    </Text>
  }
}