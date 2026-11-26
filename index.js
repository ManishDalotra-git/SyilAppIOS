// /**
//  * @format
//  */

// import { AppRegistry } from 'react-native';
// import App from './App';
// import { name as appName } from './app.json';
// import { enableScreens } from 'react-native-screens';
// enableScreens();
// AppRegistry.registerComponent(appName, () => App);



/**
 * @format
 */

import {AppRegistry,} from 'react-native';
import notifee, {EventType,} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './App';
import {name as appName,} from './app.json';
import {enableScreens,} from 'react-native-screens';
enableScreens();

/*
 * =====================================================
 * NOTIFICATION BACKGROUND / KILLED PRESS
 * =====================================================
 */

notifee.onBackgroundEvent(
  async ({
    type,
    detail,
  }) => {
    if (
      type !== EventType.PRESS
    ) {
      return;
    }
    try {
      const data =
        detail?.notification
          ?.data;
      console.log('BACKGROUND notification pressed:', data,);
      if (!data?.ticketId) {
        console.log('Background notification ticketId missing',);
        return;
      }
      await AsyncStorage.setItem(
        'pendingNotificationTicket',
        JSON.stringify(data),
      );
      console.log('Pending notification ticket saved',);
    } catch (error) {
      console.error('Background notification handler error:', error,);
    }
  },
);

AppRegistry.registerComponent(
  appName,
  () => App,
);