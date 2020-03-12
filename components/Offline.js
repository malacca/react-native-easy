import React from 'react';
import Button from './Button';
import {normalize} from './../utils/normalizeText';
import {StyleSheet, TouchableOpacity, View, Image, Text} from 'react-native';

/**
  Http 请求失败

  <Offline 
    reload={}  // 刷新按钮回调, 不设置该属性则不显示刷新按钮
    help={}    // 帮助链接点击回调, 不设置则不显示
    colors={
      icon:"",   //图标颜色
      title:"",  //标题文字颜色
      msg:"",    //描述文字颜色
      button:"", //刷新按钮 背景色
      buttonColor:"", //刷新按钮 文字颜色
      help:"",  //帮助链接 文字颜色
    } 
    dark  // dark 模式, 会使用另外一套默认的 colors
  />
 */
let offlineIcon = null;
export default Offline = (props) => {
  if (!offlineIcon) {
    offlineIcon = require('./../asset/offline.png')
  }
  const {reload, help, colors, dark} = props;
  const c = {...(dark ? {
    icon: '#999',
    title: '#ccc',
    msg: '#888',
    button: '#747474',
  } : {}), ...colors};
  const buttonStyle = {};
  if (c.button) {
    buttonStyle.backgroundColor = c.button;
  }
  if (c.buttonColor) {
    buttonStyle.color = c.buttonColor;
  }

  return <View style={styles.wrap}>
    <View style={styles.top}>
        <Image source={offlineIcon} style={[styles.icon, c.icon ? {tintColor:c.icon} : null]}/>
        <Text style={[styles.msgTit, c.title ? {color:c.title} : null]} allowFontScaling={false}>网络错误</Text>
        <Text style={[styles.msg, c.msg ? {color:c.msg} : null]} allowFontScaling={false}>请检查网络连接后重试</Text>
    </View>
    <View style={styles.btm}>
        {reload ? <Button title="重试" style={[styles.button, buttonStyle]} onPress={reload}/> : null}
        {help ? <TouchableOpacity activeOpacity={.8} onPress={help} style={styles.reload}>
          <Text style={[styles.reloadText, c.help ? {color:c.help} : null]}>查看解决方案</Text>
        </TouchableOpacity> : null}
    </View>
  </View>
}

const styles = StyleSheet.create({
  wrap:{
    flex:1,
    flexDirection: 'column',
  },
  top:{
    flex:1,
    flexDirection: 'column',
    justifyContent:'center',
    alignItems:'center',
  },
  icon:{
    width:198,
    height:132,
    tintColor:'#a3a3a3',
  },
  msgTit:{
    marginTop:35, 
    fontWeight:'bold',
    fontSize:normalize(20),
    color:'#6c6c6c',
  },
  msg:{
    marginTop:10,
    fontSize:normalize(16),
    color:'#bbb'
  },
  btm:{
    paddingBottom:90,
    alignItems:'center',
  },
  button:{
    width:160,
  },
  reload:{
    marginTop:15
  },
  reloadText:{
    fontSize:normalize(12),
    color:'#FF9300'
  }
})