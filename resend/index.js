import React from 'react';
import Button from './../button';
import Countdown from './../countdown';

/**
  重新发送按钮 可用于发送手机验证码按钮

  <Resend 
    send="发送验证码"     //发送文字
    wait="#time 秒后重发" //计时文字
    resend="重新发送"     //重发文字

    time={60}  // 倒计时时长
    start={true}  // 载入后是立即开始倒计时, 若为true, 直接略过发送文字显示计时文字
    onResend={Function}  // 发送/重新 的回调函数

    allowFontScaling={false} //字体大小是否跟随系统设置
    style={}        // 发送/重发 样式
    pressStyle={}   // 点击发送时的样式
    disableStyle={} // 计时文字样式
    timeStyle={}    // 计时文字中数字的样式 
    ...props        // Button 组件支持的其他属性, 如 onPress ...
  />
 */
function Resend(props) {
  const {
    send="发送验证码",
    wait='#time 秒后重发',
    resend='重新发送',
    timeStyle,
    time=10, 
    start, 
    onResend, 
    onPress,
    ...rest
  } = props;
  const buttonRef = React.useRef();
  const [sended, setSended] = React.useState(() => start);
  const onTimeEnd = () => {
    buttonRef.current.setDisable(false);
  }
  return <Button 
    {...rest}
    ref={buttonRef}
    disabled={start}
    title={ResendText}
    textProps={{
      text: sended ? resend : send,
      wait, 
      timeStyle,
      time, 
      onEnd:onTimeEnd
    }}
    onPress={function(e) {
      this.setDisable(true);
      if (!sended) {
        setSended(true);
      }
      onPress && onPress.call(this, e)
      onResend && onResend();
    }}
  />
}

/**
 * Button 的 Text 子组件
 */
function ResendText(props) {
  const {
    text, 
    wait, 
    timeStyle,
    time, 
    onEnd,
    type,
    style,
    allowFontScaling=false,
  } = props;

  // disabled 状态时, 说明正在计时, 否则使用发送文字
  const isDisabled = type === 'disabled';

  return <Countdown 
    end={0}
    start={isDisabled ? time : null}
    text={isDisabled ? wait : text}
    timeStyle={timeStyle}
    style={style}
    allowFontScaling={allowFontScaling}
    onEnd={onEnd}
  />
}

export default React.memo(Resend);