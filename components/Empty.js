import React from 'react';
import {textSize} from './../utils/normalizeText';
import {StyleSheet, View, Text} from 'react-native';

/**
  查询结果为空

  <Empty 
    msg=""  // 提示文字
    colors={
      background:"",  // 叹号图标 背景色
      foreground:"",  // 叹号图片 前景色
      msg:""    // msg 文字颜色
    } 
    dark  // 使用 dark 模式, 会使用另外一套默认的 colors
  />
 */
export default Empty = (props) => {
  const {msg:title, colors, dark} = props;

  let {background, foreground, msg} = {...(dark ? {
    background:'#666',
    foreground:'#eee',
    msg: '#ddd'
  } : {}), ...colors};
  if (background) {
    background = {backgroundColor: background};
  }
  if (foreground) {
    foreground = {backgroundColor: foreground};
  }
  if (msg) {
    msg = {color: msg}
  }

  return <View style={styles.wrap}>
    <View style={[styles.cicle, background]}>
      <View style={[styles.iconT, foreground]}/>
      <View style={[styles.iconB, foreground]} />
    </View>
    <View style={styles.msg}>
      <Text style={[styles.msgTxt, msg]}>{title||'暂无数据'}</Text>
    </View>
  </View>
}

const styles = StyleSheet.create({
  wrap:{
    flex:1,
    flexDirection: 'column',
    justifyContent:'center',
    alignItems:'center',
  },
  cicle:{
    width:60,
    height:60,
    borderRadius:30,
    alignItems:'center',
    justifyContent:'center',
    backgroundColor:'#c6c6c6',
  },
  iconT:{
    width:6,
    height:24,
    borderRadius:3,
    backgroundColor:'#fff'
  },
  iconB:{
    width:8,
    height:8,
    borderRadius:4,
    backgroundColor:'#fff',
    marginTop:4,
  },
  msg:{
    marginTop:15,
  },
  msgTxt:{
    fontSize:textSize, 
    color:'#B7B7B7'
  }
})