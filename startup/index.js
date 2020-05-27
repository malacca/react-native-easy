import React from 'react';
import {
  Dimensions, 
  StyleSheet, 
  TouchableNativeFeedback,
  ActivityIndicator,
  ScrollView, 
  View, 
  Text,
  Alert,
} from 'react-native';
import Icon from './../icon';
import Button from './../button';
import {Modal} from './../app/modal';
import fontSize from './../utils/fontSize';

/**
 * 启动页,  可用于首次 App 启动, 需用户授权/同意协议
 * 
 * <Startup
 *    // 所需权限
 *    permissions={{
 *      // key 为权限值,  
 *      key: {
 *        icon: "",   //权限 icon 字体  
 *        name: "",   //权限名称
 *        desc: "",   //权限描述
 *        required: false,  //是否必选
 *      },
 *      ......
 *    }}
 *    onRequestPermission={Function}  //请求权限回调, 会传递选中的 key
 * 
 *    style={}              //整体样式
 *    background={}         //背景组件
 *    itemBackground=""     //权限选择框背景色
 *    primaryColor=""       //主要文字颜色
 *    minorColor=""         //次要文字颜色
 *    checkedColor=""       //选中时的颜色, 用于权限选择框边框等
 *    confirmIcon=""        //选择框选中, 那个对勾的 icon 字体, 使用 Icon 组件
 *    checkboxIcon=""       //复选框 未选中 icon 字体
 *    checkboxCheckedIcon=""//复选框 选中 icon 字体
 *    buttonStyle=""        //按钮样式
 * 
 *    // 协议弹层配置
 *    argumentProps={{
 *        url:"",           //协议地址, txt 文本
 *        style:"",         //弹层整体样式
 *        subjectStyle:"",  //弹层标题栏样式
 *        subjectColor:"",  //弹层标题栏文字颜色
 *        closeIcon:"",     //关闭按钮 icon 字体
 *        loadingColor:"",  //loading 图标颜色
 *        textColor:"",     //协议文本颜色
 *    }}
 * 
 *    argumentConfig={}     //弹出效果配置, 参见 Modal 组件的 config 
 *    
 *    ...rest,              //其他 view 支持的属性, 会添加到最外层 View 组件上
 * />
 * 
 */
function Startup(props) {
  const {
    permissions,
    onRequestPermission,
    style,
    background,
    itemBackground,
    primaryColor="#333",
    minorColor="#999",
    checkedColor="#2196F3",
    confirmIcon="√",
    checkboxIcon="□",
    checkboxCheckedIcon="☑",
    buttonStyle,
    argumentProps,
    argumentConfig,
    ...rest
  } = props;
  const modalRef = React.useRef();
  const [argument, setArgument] = React.useState(true);
  const [checked, setChecked] = React.useState(() => {
    const cks = {};
    for (let k in permissions) {
      cks[k] = true;
    }
    return cks;
  });

  const selectItem = (key) => {
    if (permissions[key].required) {
      return;
    }
    const newChecked = {...checked};
    newChecked[key] = !checked[key];
    setChecked(newChecked)
  }

  const showArgument = () => {
    modalRef.current.open(ArgumentBox, {
      start: "bottom",
      overlayColor:"rgba(0,0,0,.5)",
      overlayClose:true,
      ...argumentConfig
    }, argumentProps)
  }

  const submit = () => {
    if (!argument) {
      Alert.alert('温馨提示','您需要同意用户协议才能继续');
      return;
    }
    if (onRequestPermission) {
      const perms = [];
      for (let k in checked) {
        if (checked[k]) {
          perms.push(k)
        }
      }
      onRequestPermission(perms);
    }
  }

  const primaryStyle = {
    color: primaryColor,
  }
  const minorStyle = {
    color: minorColor,
  }
  const itemStyle = {
    backgroundColor:itemBackground
  }
  const borderNormal = {
    borderColor: minorColor,
  }
  const borderChecked = {
    borderColor: checkedColor,
  }
  const checkedStyle = {
    color: checkedColor,
  }

  const backgroundComponent = background ? <View style={StyleSheet.absoluteFill}>
    {React.isValidElement(background) ? background : background()}
  </View> : null;

  return <View style={[styles.flex, style]} {...rest}>
    {backgroundComponent}

    <View style={styles.header}>
      <Text style={[styles.subject, primaryStyle]}>欢迎使用</Text>
      <Text style={[styles.subjectDes, minorStyle]}>为保证 APP 正常运行，请授权以下权限</Text>
    </View>

    <View style={styles.body}><ScrollView contentContainerStyle={styles.bodyScroll}>
      {Object.keys(checked).map(key => {
        const selected = checked[key];
        const perm = permissions[key];
        return (
          <TouchableNativeFeedback key={key} onPress={() => selectItem(key)}>
            <View style={[styles.permItem, itemStyle, selected ? [styles.permItemChecked, borderChecked] : borderNormal]}>
              <Text style={[styles.permTit, primaryStyle]}>
                <Icon text={perm.icon} />
                {(perm.icon ? " " : '') + perm.name}
              </Text>
              <Text style={[styles.permDes, minorStyle]}>{perm.desc}</Text>
              <Icon text={confirmIcon} style={[styles.permConfirm, checkedStyle,  selected ? styles.permConfirmChecked : null]}/>
            </View>
          </TouchableNativeFeedback>
        )
      })}
    </ScrollView></View>

    <View style={styles.footer}>
      <View style={styles.argument}>
        <TouchableNativeFeedback onPress={() => setArgument(!argument)}>
          <View style={styles.argumentCheck}>
            <Icon 
              text={argument ? checkboxCheckedIcon : checkboxIcon} 
              style={argument ? [styles.argumentBoxChecked, checkedStyle] : [styles.argumentBox, minorStyle]}
            />
            <Text style={[styles.argumentTxt, minorStyle]}>我已阅读并同意</Text>
          </View>
        </TouchableNativeFeedback>
        <TouchableNativeFeedback onPress={showArgument}>
          <Text style={[styles.argumentLink, primaryStyle]}>用户协议</Text>
        </TouchableNativeFeedback>
      </View>

      <Button title="授权并开启APP" style={[styles.enter, buttonStyle]} onPress={submit}/>
    </View>
    <Modal ref={modalRef} />
  </View>
}

function ArgumentBox(props) {
  const {
    url,
    close,
    style,
    subjectStyle,
    subjectColor,
    closeIcon="×",
    loadingColor,
    textColor,
  } = props;

  const [argument, setArgument] = React.useState();
  React.useEffect(() => {
    if (url) {
      var xhr = new XMLHttpRequest();
      xhr.onerror = function() {
        setArgument('获取协议失败')
      };
      xhr.onload = function() {
        setArgument(xhr.responseText)
      };
      xhr.open('GET', url, true);
      xhr.responseType = 'text';
      xhr.send();
    } else {
      setArgument('获取协议失败')
    }
  }, [])

  const subjectTextStyle = {
    color:subjectColor
  }
  return <View style={[styles.box, style]}>
    <View style={[styles.boxTit, subjectStyle]}>
      <Text style={subjectTextStyle}>用户协议</Text>
      <TouchableNativeFeedback onPress={close}>
        <Icon text={closeIcon} style={subjectTextStyle} />
      </TouchableNativeFeedback>
    </View>
    {argument ? (
      <ScrollView style={{flex:1}} contentContainerStyle={{padding:10}}>
        <Text style={{color:textColor}}>{argument}</Text>
      </ScrollView>
    ) : (
      <View style={styles.boxLoading}>
        <ActivityIndicator color={loadingColor}/>
      </View>
    )}
  </View>
}

const {width:screenWidth} = Dimensions.get('window');
const styles = StyleSheet.create({
  flex:{
    flex:1,
    paddingHorizontal:20,
  },

  header:{
    marginTop:20,
    marginBottom:10,
  },
  subject:{
    fontSize:fontSize.large,
  },
  subjectDes:{
    marginTop:8,
  },

  body:{
    flex:1,
  },
  bodyScroll:{
    justifyContent:"center",
    flexGrow : 1,
  },
  permItem:{
    padding:10,
    marginVertical:5,
    borderRadius:6,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: .65,
  },
  permItemChecked:{
    padding: 10 + StyleSheet.hairlineWidth - 2,
    borderWidth: 2,
    opacity: .85,
  },
  permTit:{
    fontSize: fontSize.big,
  },
  permDes:{
    fontSize: fontSize.small,
    marginTop: 8,
  },
  permConfirm:{
    position:"absolute",
    top:15,
    right:15,
    opacity:0,
  },
  permConfirmChecked:{
    opacity:1,
  },

  footer:{
    marginVertical:15,
  },
  argument:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"center",
  },
  argumentCheck:{
    flexDirection:"row",
    alignItems:"center",
  },
  argumentBox:{
    fontSize:fontSize.size,
  },
  argumentBoxChecked:{
    fontSize:fontSize.size,
  },
  argumentTxt:{
    fontSize:fontSize.small,
    marginLeft:5,
  },
  argumentLink:{
    fontSize:fontSize.small,
    textDecorationLine:"underline",
    marginLeft:2,
  },
  enter:{
    marginTop:14,
  },

  box:{
    alignSelf:"center",
    width: screenWidth,
    marginTop: 20,
    borderTopLeftRadius:4,
    borderTopRightRadius:4,
    overflow:"hidden",
    elevation:6,
    backgroundColor:'#fff',
  },
  boxTit:{
    paddingVertical:8,
    paddingHorizontal:10,
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
    backgroundColor:"#eee",
  },
  boxLoading:{
    flex:1, 
    alignItems:"center", 
    justifyContent:"center",
  },
  boxText:{
    fontSize:fontSize.small,
  }
})

export default Startup;