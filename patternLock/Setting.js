import React from "react";
import {StyleSheet, TouchableOpacity, Text} from "react-native";
import Panel from './Panel';
import Verification from './Verification';

/**
 * 设置解锁图案
 * 
 * <Setting
 *    oldPass={Array<number>}  // 旧密码, 在设置新密码前先验证旧密码, 不设置则无此步骤
 *    renderHelp={Function}    // 在解锁图案下方显示一个组件, 用于处理忘记旧密码的情况
 *    least={number}           // 新密码最少个数
 *    messages={{}}            // 不同状况下的提示词
 *    panProps={{}}            // 确认新密码界面, 上面提示盘的 props 设置, 参考 Panel 组件 Props
 *    resetStyle={}            // 确认新密码界面, 重新设置按钮样式
 *    onSet={Array<number>=>}  // 新密码设置完成后
 * 
 *    ......                   // 其他任意 Verification 组件支持的 props
 * />
 */
function Setting(props) {
  const {
    oldPass,
    renderHelp,
    least=4,
    messages,
    panProps,
    color,
    resetStyle,
    onSet,
    ...rest
  } = props;

  const newPassRef = React.useRef();
  const [step, setStep] = React.useState(
    Array.isArray(oldPass) && oldPass.length ? 0 : 1);
  const tips = {
    ...DEF_MESSAGE,
    ...messages
  };
  let verMessage, renderHeader, renderFooter, onEnd;
  if (step > 1) {
    verMessage = tips.repeat;
    renderHeader = () => {
      return <Panel
        size={42}
        radius={6}
        borderColor={color}
        fillColor={color}
        style={{
          marginBottom:30,
        }}
        {...panProps}
        password={newPassRef.current}
      />
    }
    renderFooter = () => {
      return <TouchableOpacity activeOpacity={.7} onPress={() => {
        newPassRef.current = [];
        setStep(1);
      }}>
        <Text style={[styles.reset, resetStyle]}>{tips.reset}</Text>
      </TouchableOpacity>
    }
    onEnd = (pass) => {
      if (newPassRef.current.join('') !== pass.join('')) {
        return tips.different;
      }
      onSet && onSet(pass)
      return true;
    }
  } else if (step > 0) {
    verMessage = tips.set;
    onEnd = (pass) => {
      if (least && pass.length < least) {
        return tips.least.replace(/~number~/g, least);
      }
      newPassRef.current = pass;
      setStep(2);
      return true;
    }
  } else {
    verMessage = tips.check;
    renderFooter = renderHelp;
    onEnd = (pass) => {
      if (oldPass.join('') !== pass.join('')) {
        return tips.error;
      }
      setStep(1);
      return true;
    }
  }

  return <Verification
    {...rest}
    message={verMessage}
    color={color}
    onEnd={onEnd}
    renderHeader={renderHeader}
    renderFooter={renderFooter}
  />
}

const DEF_MESSAGE = {
  check: '请绘制原解锁图案',
  error: '图案错误，请重新绘制',
  set: '设置解锁图案',
  least: '至少连接 ~number~ 个点，请重新绘制',
  repeat: '再次绘制解锁图案',
  different: '与上次绘制不一致，请重新绘制',
  reset: '重新设置'
}

const styles = StyleSheet.create({
  reset:{
    alignSelf:"stretch",
    textAlign:"center",
    marginTop: 30,
    color:"#409EFF",
  },
});

export default React.memo(Setting);