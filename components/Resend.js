import React from 'react';
import {Text} from 'react-native';
import Button from './Button';
import Countdown from './Countdown';

// Button 的 Text 子组件
class ResendText extends React.PureComponent {

  // 待发送状态 点击效果
  onPress(style){
    if (this.refs.t) {
      this.refs.t.setNativeProps({style})
    }
  }

  // 倒计时结束 enable Button
  _enable = () => {
    this.props.button.setDisable(false)
  }

  render(){
    const {
      text, waitText, time, allowFontScaling, 
      style, secStyle, button
    } = this.props;

    // 待发送状态
    if (!button.isDisabled()) {
      return <Text allowFontScaling={allowFontScaling} style={style} ref="t">{text}</Text>
    }

    // 等候状态
    const secProps = {
      allowFontScaling,
      start:time,
      end:0,
      onEnd: this._enable
    };

    // 没有设置 倒计时数字样式, 直接用 Countdown 组件即可
    if (!secStyle) {
      const timeText = waitText.replace('#sec', '#time');
      return <Countdown {...secProps} style={style} text={timeText}/>
    }

    // 倒计时数字 为独立样式
    let prev = null, next = null;
    const index = waitText.indexOf('#sec');
    if (index > -1) {
      prev = waitText.substring(0, index);
      next = waitText.substring(index + 4);
    } else {
      prev = waitText;
    }
    return <Text allowFontScaling={allowFontScaling} style={style}>
      {prev}
      <Countdown {...secProps} style={secStyle}/>
      {next}
    </Text>
  }
}

/**
  重新发送按钮 用于发送手机验证码按钮

  <Resend 
    text="重新发送"  // 计时开始前文字
    waitText="#sec 秒后重发"   //计时开始后文字
    time={60}     // 倒计时时长
    start={true}  // 载入后是否立即切换到 倒计时状态
    onResend={Function}  // 重新发送的回调函数

    allowFontScaling={false} //字体大小是否跟随系统设置
    style={}        // 倒计时开始前的样式
    pressStyle={}   // 点击时的样式
    disableStyle={} // 倒计时开始后的样式
    secStyle={}     // 单独为倒计时数字设置样式 
    ...props        // 其他 TouchableWithoutFeedback 支持的属性
  />
 */
export default Resend = (props) => {
  const {
    text='重新发送', 
    waitText='#sec 秒后重发', 
    time=60, 
    start, 
    onResend, 
    secStyle,
    onPress,
    ...moreProps
  } = props;

  const disabled = start ? true : false;
  const textProps = {text, waitText, time, onResend, secStyle};

  return <Button 
    {...moreProps}
    title={ResendText}
    textProps={textProps}
    disabled={disabled}
    onPress={function(e) {
      this.setDisable(true);
      onPress && onPress.call(this, e)
      onResend && onResend();
    }}
  />
}