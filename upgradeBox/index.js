import React from 'react';
import {
  Dimensions,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Animated,
  Linking,
  View,
  Text,
} from 'react-native';
import {external, fs, fetchPlus} from "react-native-archives";
import AsText from './../text';
import fontSize from './../utils/fontSize';
import createEvent from './../utils/createEvent';

const CACHE_DIR = external.AppCaches;

/**
 * 升级提示框, 一般配合 Modal 使用 依赖
 * react-native-archives
 * 
 * <UpgradeBox
 *    url=""           //打开 url
 *    target=""        //打开方式, 支持  "fetch | system | link"
 *                     //分别为 内置下载/系统下载/打开外部链接(比如可跳到应用市场)
 *    style={}         //最外层 View 样式
 * 
 *    title={}         //标题栏, 可指定为 string 或 RN 组件
 *    titleStyle={}    //title为string时, 标题栏样式
 * 
 *    desc={}          //描述区, 可指定为 string 或 RN 组件
 *    descStyle={}     //desc为string时, 描述区样式
 *    
 *    donwloadColor=""   //下载按钮颜色值
 *    downloadText=""    //下载按钮文字
 *    progressText=""    //正则下载时的文字, 可使用 "~percent~" 代指下载进度
 *                       //如默认: "正在下载(~percent~)"
 *    progressOpacity=.2 //下载进度条透明度
 * 
 *    cancelTxt=""       //取消文字, 若不可取消, 设置为 null 即可
 *    cancelReplace=""   //开始下载后, 取消文字的替代文字, 此时不能点击了, 若为 null 则不替换, 仍可取消
 *    cancelStyle={}     //取消文字样式
 *    cancelAbort={true} //取消后是否中断下载, 仅在 target=fetch 的情况下有效, target=system 仍会继续下载
 *    
 *    onCancel={Function(e)}    //点击取消回调, 默认为 取消fetch 并关闭升级框
 *                              //可通过 e.preventDefault() 阻止默认行为
 *    onConfirm={Function(e)}   //下载开始前回调, 默认为根据 target 设置进行相应
 *                              //可通过 e.preventDefault() 阻止默认行为
 * 
 *    // onConfirm 没有阻止默认行为, 可绑定以下监听
 *    onError={Function(error)}   //相应 target 失败的回调
 *    onDownload={Function({file, mime})} //相应 target 完成的回调, target 为 fetch 或 system 
 *                                        //参数为 {file:文件保存路径,  mime:文件mimeType}
 * 
 *    autoOpen=false      //下载完成后是否自动打开文件
 *    onOpen={Function}   //自动打开文件成功
 *    onOpenFailed={Function(error)}  //自动打开文件失败, 比如没有对应程序
 * 
 *    ...rest  // 其他任意 View 支持的 Props, 会应用在最外层 View 上
 * />
 * 
 */
function UpgradeBox(props) {
  const textRef = React.useRef();
  const cancelRef = React.useRef();
  const cacheRef = React.useRef({
    abortController: null,
    translateX: new Animated.Value(0),
    width: 0,
  });
  const [status, setStatus] = React.useState(0);
  if (status === 2) {
    return null;
  }

  const {
    url,
    target,

    style,
    title="发现新版本",
    titleStyle,
    desc="提升稳定性\n修复若干小Bug",
    descStyle,
    donwloadColor="#2196F3",
    downloadText="立即升级",
    progressText="正在下载(~percent~)",
    progressOpacity=.2,

    cancelTxt="暂不提醒",
    cancelReplace="",
    cancelStyle,
    cancelAbort=true,

    onCancel,
    onConfirm,
    onError,
    onDownload,

    autoOpen,
    onOpen,
    onOpenFailed,

    ...rest
  } = props;
  const cacheStore = cacheRef.current;
  
  // 标题栏
  const titleComponet = title ? (typeof title === 'string' ? (
    <Text style={[styles.title, titleStyle]}>{title}</Text>
  ) : (
    React.isValidElement(title) ? title : title()
  )) : null;

  // 升级描述
  const descComponet = desc ? (typeof desc === 'string' ? (
    <Text style={[styles.desc, descStyle]}>{desc}</Text>
  ) : (
    React.isValidElement(desc) ? desc : desc()
  )) : null;

  // 取消升级
  let cancelComponet = null;
  if (cancelTxt) {
    const cancelFlatStyle = StyleSheet.flatten([styles.cancel, cancelStyle]);
    const cancelOpacity = 'opacity' in cancelFlatStyle ? cancelFlatStyle.opacity : 1;
    const onCancelPressIn = () => {
      cancelRef.current.setNativeProps({
        style:{opacity: .75}
      })
    }
    const onCancelPressOut = () => {
      cancelRef.current.setNativeProps({
        style:{opacity: cancelOpacity}
      })
    }
    const onCancelPress = () => {
      if (onCancel) {
        const e = createEvent();
        onCancel(e);
        if (e.defaultPrevented) {
          return;
        }
      }
      if (cacheStore.abortController) {
        cacheStore.abortController.abort()
      }
      setStatus(2);
    }
    cancelComponet = (
      <TouchableWithoutFeedback
        onPressIn={onCancelPressIn}
        onPressOut={onCancelPressOut}
        onPress={onCancelPress}
      >
        <Text style={cancelFlatStyle} ref={cancelRef}>{cancelTxt}</Text>
      </TouchableWithoutFeedback>
    );
  }

  // 下载处理
  const onLayout = (e) => {
    cacheStore.width = e.nativeEvent.layout.width;
  }
  const onDownloadPress = () => {
    if (onConfirm) {
      const e = createEvent();
      onConfirm(e);
      if (e.defaultPrevented) {
        return;
      }
    }
    if (!url) {
      return callError('url is empty');
    }
    if (target === 'link') {
      Linking.openURL(url).then(onDownload).catch(onError);
      return;
    }
    setStatus(1);
    updateProgress(0);
    startDownload();
  }

  const startDownload = () => {
    // fetch 下载
    if (target === 'fetch') {
      const ext = url.split('?')[0].split('/').pop().split('.').pop();
      const saveTo = CACHE_DIR + '/update' + (ext ? '.' + ext : '');
      const file = 'file://' + saveTo;
      const options = {
        saveTo,
        onDownload:(e) => {
          requestAnimationFrame(() => {
            const percent = Math.round((e.loaded / e.total) * 100);
            updateProgress(Math.min(100, Math.max(0, percent)))
          })
        }
      };
      if (cancelAbort) {
        cacheStore.abortController = new AbortController();
        options.signal = cacheStore.abortController.signal;
      }
      fetchPlus(url, options).then(() => {
        fs.getMime(saveTo).then(mime => {
          onDownload && onDownload({file, mime});
          if (autoOpen) {
            fs.openFile(file, mime||"").then(onOpen).catch(onOpenFailed);
          }
        }).catch(() => {
          onDownload && onDownload({file, mime: ""});
          if (autoOpen) {
            onOpenFailed && onOpenFailed('file or mime is error');
          }
        })
      }).catch(onError);
      return;
    }

    // system 下载
    const options = {
      url,
      onError,
      onProgress:(e) => {
        requestAnimationFrame(() => {
          updateProgress(Math.min(100, Math.max(0, Math.round(e.percent))))
        })
      },
      onDownload:({file, mime}) => {
        onDownload && onDownload({file, mime});
      },
    }
    if (autoOpen) {
      options.onAutoOpen = (e) => {
        if (e) {
          onOpenFailed && onOpenFailed(e);
        } else {
          onOpen && onOpen();
        }
      }
    }
    fs.download(options).catch(onError);
  }

  const updateProgress = (percent) => {
    if (textRef && textRef.current) {
      textRef.current.setText(progressText.replace('~percent~', percent + '%'));
      cacheStore.translateX.setValue(percent)
    }
  }

  const callError = (e) => {
    onError && onError(e)
  }

  const progressStyle = {
    backgroundColor: donwloadColor,
    opacity: status ? progressOpacity : 0,
  }
  if (status) {
    progressStyle.transform = [{
      translateX: cacheStore.translateX.interpolate({
        inputRange: [0, 100],
        outputRange: [-1 * cacheStore.width, 0]
      })
    }]
  }

  return <View style={[styles.box, style]} {...rest}>
    {titleComponet}
    {descComponet}
    <TouchableOpacity 
      onLayout={onLayout}
      onPress={onDownloadPress}
      style={[styles.donwload, {borderColor: donwloadColor}]} 
      activeOpacity={.75}
      disabled={Boolean(status)}
    >
        <Animated.View style={[styles.progress, progressStyle]}/>
        <AsText style={[styles.donwloadTxt, {color:donwloadColor}]} ref={textRef}>{downloadText}</AsText>
    </TouchableOpacity>
    {cancelComponet}
  </View>
}

const {width:screenWidth} = Dimensions.get('window');
const styles = StyleSheet.create({
  box:{
    overflow:"hidden",
    width: screenWidth - 90,
    paddingBottom:20,
    backgroundColor:"#fff",
    borderRadius:6,
    elevation:3,

    marginLeft:30,
    marginTop:40,
  },
  title:{
    paddingVertical:12,
    textAlign:"center",
    backgroundColor:"#2196F3",
    color:"#fff"
  },
  desc:{
    marginHorizontal:20,
    marginVertical:15,
    fontSize:fontSize.small,
    lineHeight:fontSize.small * 1.8,
    color:"#666",
  },
  donwload:{
    marginHorizontal:20,
    borderWidth:StyleSheet.hairlineWidth,
    paddingVertical:8,
    borderRadius:100,
    overflow:"hidden",
  },
  donwloadTxt:{
    fontSize:fontSize.size,
    textAlign:"center",
  },
  progress:{
    ...StyleSheet.absoluteFill,
    opacity:.2,
  },
  cancel:{
    textAlign:"center",
    fontSize: fontSize.small,
    marginTop:15,
    color:"#999"
  }
});

export default React.memo(UpgradeBox);