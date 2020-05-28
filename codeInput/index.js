import React from 'react';
import Cursor from './../cursor';
import splitStyle from './../utils/splitStyle';
import {Platform, Keyboard, StyleSheet, TextInput, View, Text} from 'react-native';

/**
  已有 react-native-confirmation-code-input / react-native-phone-auth-component 等
  目前发现的都是在 textinput 上做文章, 有几个弊端
    1. 进行自定义样式时不是很方便, 如光标尺寸颜色/文字对齐 等
    2. 可能要使用多个 textinput 对于系统键盘可能自带的验证码提取不是特别友好

  所以使用这里 view 组件进行模拟, 可充分释放想象力, 非常易于定制样式 

  <CodeInput 
    style,     // 包裹 items 的外层组件样式
    length=6,  // 个数
    size=28,   // 字体大小

    cursorColor,    // 光标颜色
    cursorRate=500, // 光标频率
    cursorWidth=2,  // 光标宽度
    cursorHeight,   // 光标高度, 默认使用 size

    autoFocus=false,  // 自动 focus
    keyboardAppearance='default',  // 键盘颜色 (default/light/dark), 仅 iOS生效
    keyboardHidesBlur=true,  // 键盘收起后自动 blur

    //事件监听
    onFocus, 
    onBlur, 
    onCodeChange, 
    onFill, 

    itemType="underline", // item 类型, 默认的 item 支持 type:enum('round', 'ring', 'square', 'underline')
    activeStyle,   // item 激活样式, 可设置 box 和 text 样式, 会自动分离
    inactiveStyle, // item 未激活样式, 同上
    item:null,  // ReactComponent, 自定义 item
    itemProps,  // Object, 其他需要传递给自定义 Item 的 props, 
                // 最终会传递给 item 的 props:{...itemProps, index, focused, itemType, style, children}
                // 会在 聚焦/失焦 时, 更新 props.style 为 activeStyle/inactiveStyle

    ...props  // 最外层组件 (View) 支持的其他属性
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
  _lastFocus = null;

  componentDidMount(){
    this._keyboardListener = Keyboard.addListener('keyboardDidHide', this._onkeyboardDidHide);
  }
  componentWillUnmount(){
    this._keyboardListener.remove();
  }
  _onkeyboardDidHide = () => {
    const {keyboardHidesBlur=true} = this.props;
    keyboardHidesBlur && this.blur();
  }

  // 暴露给外部的方法
  disable = () => {
    this.blur();
    this.setState({editable:false})
  }
  enable = () => {
    this.setState({editable:true})
  }
  isFocused = () => {
    return this.refs.input.isFocused();  
  }
  focus = () => {
    !this.isFocused() && this.refs.input.focus();
  }
  blur = () => {
    this.isFocused() && this.refs.input.blur();
  }
  codes = () => {
    return this._codes;  
  }
  setCode = (codes) => {
    this._codes = [];
    this.addCode(codes);
  }
  addCode= (codes) => {
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
  backspace = (length) => {
    const len = this._codes.length;
    if (len) {
      length = Math.min(len, Math.max(1, parseInt(length)) );
      this._codes = this._codes.slice(0, len - length);
    }
    this._updateCodes();
    return length;
  }
  clear = () => {
    this._codes = [];
    this._updateCodes();
  }

  _onFocus = (e) => {
    if (this._codes.length < this._codeLength) {
      this._updateItem();
      this.refs.cursor.blink();
    }
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
      this.refs.cursor.blink();
    }
  }
  _onChangeText = (text) => {
    this.addCode(text);
  }

  // 更新所有已输入数字
  _updateCodes = () => {
    const len = this._codes.length;
    for (let k=0; k<this._codeLength; k++) {
      this._changeCode(k, false);
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

  // 更新 Cursor 和 Input
  _updateOffset = () => {
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

  // 更新 Item 激活状态
  _updateItem = (blur) => {
    if (this._lastFocus !== null) {
      this._setFocused(this._lastFocus, false);
    }
    if (blur) {
      this._lastFocus = null;
      return;
    }
    const focus = this._codes.length;
    if (focus < this._codeLength) {
      this._setFocused(focus, true);
      this._lastFocus = focus;
    } else {
      this._lastFocus = null;
    }
  }

  _setFocused = (index, focused) => {
    const mKey = 'M' + index;
    if (this.refs[mKey]) {
      this.refs[mKey].setFocused(focused);
    }
    this._changeCode(index, focused);
  }

  _changeCode = (index, focused) => {
    const tKey = 'T' + index;
    if (!this.refs[tKey]) {
      return;
    }
    const isHolder = index >= this._codes.length;
    const code = isHolder ? '0' : this._codes[index];
    this.refs[tKey].setText(focused, code, isHolder)
  }

  render() {
    const {
      style,
      length=6,
      size=28,

      cursorColor,
      cursorRate,
      cursorWidth=2,
      cursorHeight,

      autoFocus=false,
      keyboardAppearance='default',

      itemType,
      activeStyle,
      inactiveStyle,
      item=CodeItem,
      itemProps,
      
      onFocus, 
      onBlur,
      onCodeChange,
      onFill,
      ...props
    } = this.props;

    this._codeLength = length;
    this._cursorWidth = cursorWidth;

    // 创建 Items
    const {
      wrapStyle:activeWrap, 
      textStyle:activeText
    } = splitStyle(activeStyle);
    const {
      wrapStyle:inactiveWrap, 
      textStyle:inactiveText
    } = splitStyle(inactiveStyle);
    const wrapProps = {
      ...itemProps,
      item,
      itemType,
      activeStyle: activeWrap,
      inactiveStyle: inactiveWrap,
    };
    const textProps = {
      activeStyle: activeText,
      inactiveStyle: inactiveText,
      size,
    }
    const items = [];
    for (let i=0; i<length; i++) {
      (k => {
        // text 为空的时候,要弄个占位符,不然父级 item 可能撑不开
        const textKey = 'T'+k;
        const isHolder = k >= this._codes.length;
        const textValue = isHolder ? '0' : this._codes[k];
        const text = <DynamicText 
          {...textProps} 
          isHolder={isHolder}
          text={textValue} 
          ref={textKey}
        />
        // item
        const wrapKey = "M"+k;
        const item = <View key={wrapKey} onLayout={e => {
          const rect = e.nativeEvent.layout;
          this._layouts['L'+k] = rect.x + rect.width / 2;
          this._updateOffset();
        }}><CodeItemWrap {...wrapProps} index={k} ref={wrapKey}>
          {text}
        </CodeItemWrap></View>;
        // push
        items.push(item)
      })(i)
    }

    return <View {...props} style={[styles.wrap, style]}>
      {items}
      <Cursor 
        width={cursorWidth} 
        height={cursorHeight||size} 
        color={cursorColor} 
        blink={false}
        rate={cursorRate}
        ref="cursor"
      />
      <TextInput 
        multiline={false}
        allowFontScaling={false}
        autoCorrect={false}
        caretHidden={true}
        disableFullscreenUI={true}
        enablesReturnKeyAutomatically={true}
        autoCapitalize="none"
        autoComplete="off"
        keyboardType="number-pad"
        selectionColor={transparent}
        underlineColorAndroid={transparent}
        keyboardAppearance={keyboardAppearance}
        autoFocus={autoFocus}
        editable={this.state.editable}
        onFocus={this._onFocus}
        onKeyPress={this._onKeyPress}
        onChangeText={this._onChangeText}
        onBlur={this._onBlur}
        style={styles.input}
        ref="input"
        value=""
      />
    </View>
  }
}

// Item 外层, 提供 ref 给 CodeInput 以避免整体更新
// 在失焦/聚焦 时仅更新当前 Item
const CodeItemWrap = React.forwardRef((props, ref) => {
  const [focused, setFocused] = React.useState(() => Boolean(props.focused));
  React.useImperativeHandle(ref, () => {
    return {
      setFocused
    };
  });
  const {
    item:Item,
    activeStyle,
    inactiveStyle,
    ...itemProps
  } = props;
  return <Item {...itemProps} focused={focused} style={focused ? activeStyle : inactiveStyle}/>;
});

// 默认 Item 
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
function CodeItem(props) {
  const {itemType, focused, style, children} = props;
  const realType = itemType && itemType in itemStyles ? itemType : 'underline';
  const itemStyle = {...itemStyles[realType]};
  itemStyle.props.forEach(p => {
    itemStyle[p] = focused ? "black" : "gray";
  });
  delete itemStyle.props;
  return <View style={[itemStyle, style]} children={children} />
}

// Item 的 Text children
const DynamicText = React.forwardRef((props, ref) => {
  const {
    text,
    isHolder,
    focused, 
    size,
    activeStyle, 
    inactiveStyle, 
    ...rest
  } = props;
  const [store, setStore] = React.useState(() => ({
    text,
    isHolder,
    focused
  }));
  React.useImperativeHandle(ref, () => {
    return {
      setText: (focused, text, isHolder) => {
        if (focused !== store.focused 
          || text !== store.text 
          || isHolder !== store.isHolder
        ) {
          setStore({
            ...store,
            text,
            isHolder,
            focused
          })
        }
      }
    };
  });
  return <Text 
    {...rest} 
    allowFontScaling={false} 
    style={[
      styles.code,
      {fontSize: size}, 
      store.focused ? activeStyle : inactiveStyle,
      store.isHolder ? styles.codeHolder : null
    ]}
  >{store.text}</Text>
});

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
  codeHolder:{
    opacity:0
  }
})