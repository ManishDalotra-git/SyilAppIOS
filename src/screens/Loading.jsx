import React, {
  useEffect,
  useRef,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  StatusBar,
  Platform,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  hasPendingTicket,
  openPendingTicket,
} from '../navigation/navigationRef';


const {
  width,
  height,
} = Dimensions.get('window');

const CIRCLE_SIZE =
  Math.max(width, height) * 1.5;


const Loading = ({ navigation }) => {

  StatusBar.setTranslucent(true);

  StatusBar.setBackgroundColor(
    'transparent',
  );

  StatusBar.setBarStyle(
    'dark-content',
  );


  const progress =
    useRef(
      new Animated.Value(0),
    ).current;

  const scaleAnim =
    useRef(
      new Animated.Value(0),
    ).current;


  useEffect(() => {

    /*
     * Loading animation.
     */
    Animated.timing(
      scaleAnim,
      {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      },
    ).start();


    Animated.timing(
      progress,
      {
        toValue:
          width - 60,

        duration: 3500,

        useNativeDriver: false,
      },
    ).start();


    /*
     * Sirf ONE timer.
     *
     * Purana Ticket wala alag timer
     * completely remove kar diya.
     */
    const timer =
      setTimeout(() => {
        checkLoginStatus();
      }, 4000);


    return () => {
      clearTimeout(timer);
    };

  }, []);


  const checkLoginStatus = async () => {
  try {

    const isLoggedIn =
      await AsyncStorage.getItem(
        'isLoggedIn',
      );

    const lastLoginTime =
      await AsyncStorage.getItem(
        'lastLoginTime',
      );


    if (
      !isLoggedIn ||
      !lastLoginTime
    ) {
      navigation.replace(
        'Login',
      );

      return;
    }


    const now =
      Date.now();

    const diffInDays =
      (
        now -
        Number(lastLoginTime)
      ) /
      1000 /
      60 /
      60 /
      24;


    if (diffInDays > 7) {

      await AsyncStorage.clear();

      navigation.replace(
        'Login',
      );

      return;
    }


    /*
     * =====================================================
     * CHECK NOTIFICATION OPEN
     * =====================================================
     */

    const pendingRaw =
      await AsyncStorage.getItem(
        'pendingNotificationTicket',
      );


    console.log(
      'Pending notification raw:',
      pendingRaw,
    );


    if (pendingRaw) {

      try {

        const data =
          JSON.parse(
            pendingRaw,
          );


        /*
         * Immediately remove so same notification
         * dubara app launch par open na ho.
         */
        await AsyncStorage.removeItem(
          'pendingNotificationTicket',
        );


        if (data?.ticketId) {

          console.log(
            'Opening notification ticket:',
            data.ticketId,
          );


          navigation.replace(
            'ViewTicketDetail',
            {
              ticketId:
                String(
                  data.ticketId,
                ),

              subject:
                String(
                  data.ticketSubject ||
                  'Ticket Details',
                ),

              threadId:
                String(
                  data.threadId ||
                  '',
                ),

              fromNotification:
                true,
            },
          );


          return;
        }

      } catch (error) {

        console.error(
          'Pending notification parse error:',
          error,
        );

        await AsyncStorage.removeItem(
          'pendingNotificationTicket',
        );
      }

    }


    /*
     * Normal app launch.
     */
    navigation.replace(
      'Home',
    );

  } catch (error) {

    console.error(
      'Loading login check error:',
      error,
    );

    navigation.replace(
      'Login',
    );
  }
};


  return (
    <ImageBackground
      style={
        styles.container
      }
    >

      <Animated.View
        style={[
          styles.backGBColor,

          {
            transform: [
              {
                translateX:
                  -CIRCLE_SIZE /
                  2,
              },

              {
                translateY:
                  -CIRCLE_SIZE /
                  2,
              },

              {
                scale:
                  scaleAnim,
              },
            ],
          },
        ]}
      />


      <Image
        source={require(
          '../../images/syil_logo.png'
        )}
        style={
          styles.logo
        }
      />


      <Text
        allowFontScaling={
          false
        }
        style={
          styles.loadingText
        }
      >
        Loading......
      </Text>


      <View
        style={
          styles.progressBar
        }
      >

        <Animated.View
          style={[
            styles.progress,

            {
              width:
                progress,
            },
          ]}
        />

      </View>

    </ImageBackground>
  );
};


export default Loading;


const styles =
  StyleSheet.create({

    backGBColor: {
      position:
        'absolute',

      width:
        CIRCLE_SIZE,

      height:
        CIRCLE_SIZE,

      borderRadius:
        CIRCLE_SIZE /
        2,

      backgroundColor:
        '#FFE600',

      top:
        '50%',

      left:
        '50%',

      justifyContent:
        'center',

      alignItems:
        'center',
    },


    container: {
      flex: 1,

      justifyContent:
        'center',

      alignItems:
        'center',

      overflow:
        'hidden',

      paddingTop:
        Platform.OS ===
        'android'
          ? 60
          : 20,
    },


    logo: {
      width:
        218.84,

      height:
        58.86,
    },


    loadingText: {
      position:
        'absolute',

      bottom:
        70,

      width:
        '100%',

      textAlign:
        'center',

      marginBottom:
        10,

      color:
        '#000',

      fontSize:
        20,

      fontWeight:
        '600',
    },


    progressBar: {
      width:
        '85%',

      height:
        14,

      backgroundColor:
        '#fff',

      borderRadius:
        10,

      overflow:
        'hidden',

      position:
        'absolute',

      bottom:
        50,
    },


    progress: {
      height:
        '100%',

      backgroundColor:
        '#000',

      borderRadius:
        10,
    },

  });