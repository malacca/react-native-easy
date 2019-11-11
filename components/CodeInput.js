import React from 'react';
import Cursor from './Cursor';
import {Platform, StyleSheet, TextInput, View, Text} from 'react-native';

// 默认 Item 样式, 可指定样式 或 直接使用 CodeInput props.Item 完全自定义
const square = {
  alignItems:'center',
  justifyContent:'center',
  aspectRatio:1,
  paddingVertical:2,
  borderStyle:'solid',
  borderWidth: StyleSheet.hairlineWidth,
  props: ['borderColor']
}
const itemStyles = {
  underline: {
    paddingHorizontal:8,
    borderBottomWidth:2,
    props: ['borderBottomColor']
  },
  ring: {
    ...square,
    borderRadius:100,
  },
  round: {
    ...square,
    borderRadius:4,
  },
  square:{
    ...square
  }
}
class CodeItem extends React.PureComponent {
  itemKey = 'underline';
  // 聚焦/失焦 的约定方法, 自行实现的话也应实现这两个方法
  // 其实是可以通过重置 props 调起 render, 但为性能考虑, 使用这种约定方法的方式
  onFocus(){
    this.setColor(this.props.activeColor);
  }
  onBlur(){
    this.setColor(this.props.inactiveColor);
  }
  setColor(color){
    const style = {};
    itemStyles[this.itemKey].props.forEach(p => {
      style[p] = color;
    });
    this.refs.v.setNativeProps({style});
  }
  render() {
    const {itemProps, inactiveColor, children} = this.props;
    if (itemProps in itemStyles) {
      this.itemKey = itemProps;
    }
    const style = {...itemStyles[this.itemKey]};
    style.props.forEach(p => {
      style[p] = inactiveColor;
    });
    delete style.props;
    return <View style={style} ref="v">{children}</View>
  }
}

/**
当前 (rn61.3) 尚无法通过 setNativeProps 直接修改 text innerText
可关注下面这个 issue, 若支持这个功能的话, 可直接使用 Text 组件
https://github.com/facebook/react-native/issues/22855
 */
class DynamicText extends React.PureComponent {
  constructor(props) {
    super(props);
    const {text} = props;
    this.state = {text};
  }
  setNativeProps(object){
    const {text, ...props} = object;
    this.setState({text});
    this._text.setNativeProps(props);
  }
  render(){
    return <Text {...this.props} ref={ref => this._text = ref}>{this.state.text}</Text>
  }
}

/**
  已有 react-native-confirmation-code-input / react-native-phone-auth-component 等
  目前发现的都是在 textinput 上做文章, 有几个弊端
  1. 进行自定义样式时不是很方便, 如光标尺寸颜色/文字对齐 等
  2. 可能要使用多个 textinput 对于系统键盘可能自带的验证码提取不是特别友好
  所以使用这里 view 组件进行模拟, 可充分释放想象力, 非常易于定制样式 
  <CodeInput 
    {...props}  // 参见 render 函数注释
  />
*/
const transparent = 'transparent';
export default class CodeInput extends React.PureComponent {
  state = {
    editable: true
  };
  _codes = [];  
  _layouts = {};
  _codeLength = 0;
  _cursorWidth = 0;
  _activeColor = '';
  _lastFocus = null;
  isFocused(){
    return this.refs.input.isFocused();  
  }
  disable(){
    this.blur();
    this.setState({editable:false})
  }
  enable(){
    this.setState({editable:true})
  }
  isFocused(){
    return this.refs.input.isFocused();
  }
  focus(){
    !this.isFocused() && this.refs.input.focus();
  }
  blur(){
    this.isFocused() && this.refs.input.blur();
  }

  codes(){
    return this._codes;  
  }
  addCode(codes){
    if (this._codes.length >= this._codeLength) {
      return;
    }
    // 只要 [0 - 9], 一旦 codes 中出现非数字, 就中断
    codes = codes.toString();
    [...codes].some(c => {
      const code = c.charCodeAt();
      if (code < 48 || code > 57) {
        return true;
      }
      this._codes.push(c);
      if (this._codes.length >= this._codeLength) {
        return true;
      }
    })
    this._updateCodes();
  }
  setCode(codes){
    this._codes = [];
    this.addCode(codes);
  }
  backspace(length){
    const len = this._codes.length;
    if (len) {
      length = Math.min(len, Math.max(1, parseInt(length)) );
      this._codes = this._codes.slice(0, len - length);
    }
    this._updateCodes();
    return length;
  }
  clear(){
    this._codes = [];
    this._updateCodes();
  }


  _onFocus = (e) => {
    this._updateItem();
    this.refs.cursor.blink();
    this.props.onFocus && this.props.onFocus(e);
  }
  _onBlur = (e) => {
    this._updateItem(true);
    this.refs.cursor.stop();
    this.props.onBlur && this.props.onBlur(e);
  }
  _onKeyPress = (e) => {
    if (e.nativeEvent.key === "Backspace") {
      this.backspace(1);
    }
  }
  _onChangeText = (text) => {
    this.addCode(text);
  }


  _updateCodes(){
    const len = this._codes.length;
    for (let k=0; k<this._codeLength; k++) {
      this._changeCode(k, k < len ? this._codes[k] : null);
    }
    if (len >= this._codeLength) {
      this.blur();
      this.props.onFill && this.props.onFill(this._codes);
      return;
    }
    this._updateOffset();
    this._updateItem();
    this.props.onCodeChange && this.props.onCodeChange(this._codes);
  }
  _updateOffset() {
    const len = this._codes.length, key = 'L'+len;
    if (!this._layouts[key]) {
        return;
    }
    // 挪动光标到正确位置
    this.refs.cursor.setOffset(
      this._layouts[key] - this._cursorWidth
    );
    // 设置 input padding 是为了让 input 长按弹出的粘贴菜单可以显示在正确位置
    this.refs.input.setNativeProps({
      style: {
          paddingLeft: this._layouts[key]
      }
    });
  }
  _updateItem(blur){
    if (this._lastFocus !== null) {
      this.refs['M'+this._lastFocus].onBlur();
    }
    if (blur) {
      this._lastFocus = null;
      return;
    }
    const focus = this._codes.length;
    if (focus < this._codeLength) {
      this.refs['M'+focus].onFocus();
      this._lastFocus = focus;
    } else {
      this._lastFocus = null;
    }
  }

  // 参考 DynamicText 注释, 若 Text 原生支持, 可进行升级
  _renderCode = (k, fontSize) => {
    let value, color;
    if (k < this._codes.length) {
      value = this._codes[k];
      color = this._activeColor;
    } else {
      value = '0';
      color = transparent;
    }
    return <DynamicText ref={'T'+k} text={value} style={[
      styles.code,
      {fontSize, color}
    ]} />
  }
  // 动态修改 DynamicText
  _changeCode = (k, code) => {
    k = 'T' + k;
    let color = this._activeColor;
    if (code === null) {
      code = '0';
      color = transparent;
    }
    if (this.refs[k]) {
      // 若原生 Text 支持, 可能不是这个语法, 要注意修改
      this.refs[k].setNativeProps({
        text: code,
        style: {color}
      })
    }
  }

  render() {
    const {
      length=6,  //个数
      size=24,  //字体大小

      inactiveColor="gray", //未激活颜色
      activeColor="black",  //激活颜色

      cursorColor, //光标颜色, 默认使用 activeColor
      cursorWidth=2, //光标宽度
      cursorHeight,  // 光标高度, 默认使用 size

      autoFocus=false, // 自动 focus
      keyboardAppearance='default', // 键盘颜色 (default/light/dark), 仅 iOS生效

      item:Item = CodeItem, //自定义 item, 自定义组件有两个约定函数, 参考 CodeItem 注释
      itemProps,  // 传递给 Item 的 props, 将传递 {itemProps, inactiveColor, activeColor, size} 给 item
                  // 默认的 item 支持 itemProps = enum('round', 'ring', 'square', 'underline')

      style,   // 包裹 items 的外层组件样式
      onFocus, onBlur, onCodeChange, onFill, //事件监听

      ...props  // 最外层组件 (View) 支持的其他属性
    } = this.props;

    this._codeLength = length;
    this._cursorWidth = cursorWidth;
    this._activeColor = activeColor;

    // 创建 Items
    let i, key;
    const items = [];
    const subProps = {itemProps, inactiveColor, activeColor, size};
    for (i=0; i<length; i++) {
      (k => {
        key = "M"+k;
        items.push(<View key={key} onLayout={e => {
          const rect = e.nativeEvent.layout;
          this._layouts['L'+k] = rect.x + rect.width / 2;
          this._updateOffset();
        }}><Item {...subProps} index={k} ref={key}>{this._renderCode(k, size)}</Item></View>)
      })(i)
    }

    return <View {...props} style={[styles.wrap, style]}>
      {items}
      <Cursor 
        width={cursorWidth} 
        height={cursorHeight||size} 
        color={cursorColor||activeColor} 
        blink={false}
        ref="cursor"
      />
      <TextInput 
        multiline={false}
        allowFontScaling={false}
        autoCorrect={false}
        disableFullscreenUI={true}
        selectionColor={transparent}
        underlineColorAndroid={transparent}
        autoCapitalize="none"
        autoComplete="off"
        keyboardType="number-pad"
        editable={this.state.editable}
        autoFocus={autoFocus}
        keyboardAppearance={keyboardAppearance}
        onFocus={this._onFocus}
        onKeyPress={this._onKeyPress}
        onChangeText={this._onChangeText}
        onBlur={this._onBlur}
        style={styles.input}
        value=""
        ref="input"
      />
    </View>
  }
}

// 使用等宽字体
const fontFamily = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const styles = StyleSheet.create({
  wrap: {
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
  },
  input:{
    ...StyleSheet.absoluteFill,
    borderColor:transparent,
    color:transparent,
    backgroundColor:transparent,
  },
  code:{
    fontWeight:"900",
    fontFamily,
  },
})