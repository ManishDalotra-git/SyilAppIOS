// import { Platform } from 'react-native';
// import { getApp } from '@react-native-firebase/app';

// import {
//   AuthorizationStatus,
//   getAPNSToken,
//   getMessaging,
//   getToken,
//   registerDeviceForRemoteMessages,
//   requestPermission,
// } from '@react-native-firebase/messaging';

// const firebaseApp = getApp();
// const messaging = getMessaging(firebaseApp);

// const API_URL = 'https://syilfordealeriosapp.onrender.com';

// export const saveFCMToken = async email => {
//   try {
//     if (!email) {
//       console.log('FCM: Email missing');
//       return null;
//     }

//     /*
//      * iOS ko APNs ke saath register karta hai.
//      * Auto-registration enabled hone par bhi ye safely call kiya ja sakta hai.
//      */
//     await registerDeviceForRemoteMessages(messaging);

//     const authStatus = await requestPermission(messaging);

//     const permissionGranted =
//       authStatus === AuthorizationStatus.AUTHORIZED ||
//       authStatus === AuthorizationStatus.PROVISIONAL;

//     if (!permissionGranted) {
//       console.log('FCM: Notification permission denied');
//       return null;
//     }

//     if (Platform.OS === 'ios') {
//       const apnsToken = await getAPNSToken(messaging);

//       console.log(
//         'APNs Token:',
//         apnsToken ? 'Generated successfully' : 'Not available yet',
//       );
//     }

//     const fcmToken = await getToken(messaging);

//     if (!fcmToken) {
//       console.log('FCM: Token is empty');
//       return null;
//     }

//     console.log('FCM Token generated successfully');

//     const response = await fetch(
//       `${API_URL}/save-dealer-fcm-token`,
//       {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           email: email.trim().toLowerCase(),
//           fcmToken,
//           platform: Platform.OS,
//         }),
//       },
//     );

//     const responseText = await response.text();

//     let responseData = {};

//     try {
//       responseData = responseText
//         ? JSON.parse(responseText)
//         : {};
//     } catch {
//       throw new Error(
//         `Server returned invalid response: ${responseText.slice(0, 150)}`,
//       );
//     }

//     if (!response.ok) {
//       throw new Error(
//         responseData.message ||
//           responseData.error ||
//           `HTTP ${response.status}`,
//       );
//     }

//     console.log(
//       'Dealer FCM token saved successfully:',
//       responseData,
//     );

//     return fcmToken;
//   } catch (error) {
//     console.error('Dealer FCM setup error:', error);
//     return null;
//   }
// };


import {
  Platform,
} from 'react-native';

import {
  getApp,
} from '@react-native-firebase/app';

import {
  AuthorizationStatus,
  getAPNSToken,
  getMessaging,
  getToken,
  requestPermission,
} from '@react-native-firebase/messaging';

import notifee, {
  EventType,
} from '@notifee/react-native';

import {
  openTicketFromNotification,
} from '../navigation/navigationRef';

const firebaseApp = getApp();

const messaging =
  getMessaging(firebaseApp);

const API_URL =
  'https://syilfordealeriosapp.onrender.com';

/*
 * Login ke baad FCM token generate karke
 * HubSpot contact me save karta hai.
 */
export const saveFCMToken = async email => {
  try {
    if (!email) {
      console.log('FCM: Email missing');
      return null;
    }

    const authStatus =
      await requestPermission(messaging);

    const permissionGranted =
      authStatus ===
        AuthorizationStatus.AUTHORIZED ||
      authStatus ===
        AuthorizationStatus.PROVISIONAL;

    if (!permissionGranted) {
      console.log(
        'FCM: Notification permission denied',
      );
      return null;
    }

    if (Platform.OS === 'ios') {
      const apnsToken =
        await getAPNSToken(messaging);

      console.log(
        'APNs Token:',
        apnsToken
          ? 'Generated successfully'
          : 'Not available yet',
      );
    }

    const fcmToken =
      await getToken(messaging);

    if (!fcmToken) {
      console.log(
        'FCM: Token is empty',
      );
      return null;
    }

    console.log(
      'FCM Token generated successfully',
    );

    const response = await fetch(
      `${API_URL}/save-dealer-fcm-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          email:
            email.trim().toLowerCase(),
          fcmToken,
          platform: Platform.OS,
        }),
      },
    );

    const responseText =
      await response.text();

    let responseData = {};

    try {
      responseData = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      throw new Error(
        `Server returned invalid response: ${responseText.slice(
          0,
          150,
        )}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        responseData.message ||
          responseData.error ||
          `HTTP ${response.status}`,
      );
    }

    console.log(
      'Dealer FCM token saved successfully:',
      responseData,
    );

    return fcmToken;
  } catch (error) {
    console.error(
      'Dealer FCM setup error:',
      error,
    );

    return null;
  }
};

/*
 * Notification par tap hone par correct ticket
 * ki ViewTicketDetail screen open karta hai.
 */
/*
 * Notification par tap hone par:
 * 1. App icon badge clear hoga
 * 2. Correct ViewTicketDetail screen open hogi
 */
export const setupNotificationNavigation =
  () => {
    console.log(
      'Notifee notification listener started',
    );

    const unsubscribe =
      notifee.onForegroundEvent(
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

            console.log(
              'Notification pressed:',
              data,
            );

            const contactId =
              data
                ?.recipientContactId;

            /*
             * Backend ko batao ki
             * ek notification read ho gayi.
             */
            if (contactId) {
              const response =
                await fetch(
                  `${API_URL}/dealer-notification-read`,
                  {
                    method:
                      'POST',

                    headers: {
                      'Content-Type':
                        'application/json',
                    },

                    body:
                      JSON.stringify({
                        contactId:
                          String(
                            contactId,
                          ),
                      }),
                  },
                );

              const result =
                await response.json();

              console.log(
                'Notification read response:',
                result,
              );

              if (
                response.ok &&
                typeof result.count ===
                  'number'
              ) {
                /*
                 * Backend ke actual count
                 * se iPhone badge update.
                 */
                await notifee.setBadgeCount(
                  result.count,
                );

                console.log(
                  'Badge updated to:',
                  result.count,
                );
              }
            }

            /*
             * Sirf tapped notification
             * remove karo.
             *
             * cancelDisplayedNotifications()
             * mat use karo, warna sari
             * notifications remove ho jayengi.
             */
            const notificationId =
              detail?.notification
                ?.id;

            if (notificationId) {
              await notifee
                .cancelNotification(
                  notificationId,
                );
            }

            /*
             * Correct ticket screen.
             */
            openTicketFromNotification(
              data,
            );
          } catch (error) {
            console.error(
              'Notification press error:',
              error,
            );
          }
        },
      );

    return unsubscribe;
  };