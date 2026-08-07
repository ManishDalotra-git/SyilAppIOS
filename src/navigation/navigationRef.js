import {
  createNavigationContainerRef,
} from '@react-navigation/native';

import AsyncStorage from '@react-native-async-storage/async-storage';

export const navigationRef =
  createNavigationContainerRef();

let pendingTicketData = null;


/*
 * User Support Team Member hai ya normal dealer,
 * AsyncStorage se check karta hai.
 */
const getTicketListScreen = async () => {
  try {
    const appSupportTeamMember =
      await AsyncStorage.getItem(
        'app_support_team_member',
      );

    console.log(
      'Notification navigation - app_support_team_member:',
      appSupportTeamMember,
    );

    const isSupportTeamMember =
      String(appSupportTeamMember || '')
        .trim()
        .toLowerCase() === 'yes';

    return isSupportTeamMember
      ? 'OwnerTickets'
      : 'ViewTicket';

  } catch (error) {
    console.error(
      'Unable to get app_support_team_member:',
      error,
    );

    /*
     * Fallback normal dealer screen.
     */
    return 'ViewTicket';
  }
};


/*
 * Correct ticket open karta hai.
 */
const navigateToTicket = async routeParams => {
  if (!navigationRef.isReady()) {
    console.log(
      'Navigation not ready',
    );

    pendingTicketData =
      routeParams;

    return;
  }

  const ticketListScreen =
    await getTicketListScreen();

  console.log(
    'Ticket listing screen:',
    ticketListScreen,
  );

  console.log(
    'Opening ticket:',
    routeParams,
  );

  /*
   * Stack ko proper structure dete hain:
   *
   * Support:
   * OwnerTickets
   *    ↓
   * ViewTicketDetail
   *
   * Normal Dealer:
   * ViewTicket
   *    ↓
   * ViewTicketDetail
   *
   * Iska benefit:
   * Back press karne par correct listing screen open hogi.
   */
  navigationRef.reset({
    index: 1,

    routes: [
      {
        name:
          ticketListScreen,
      },

      {
        name:
          'ViewTicketDetail',

        params:
          routeParams,
      },
    ],
  });
};


/*
 * Notification press se call hota hai.
 */
export const openTicketFromNotification =
  async data => {

    console.log(
      'Notification navigation data:',
      data,
    );

    if (!data?.ticketId) {
      console.log(
        'Notification ticketId missing',
      );

      return;
    }

    const routeParams = {
      ticketId:
        String(data.ticketId),

      subject:
        String(
          data.ticketSubject ||
          'Ticket Details',
        ),

      threadId:
        String(
          data.threadId || '',
        ),

      fromNotification:
        true,
    };

    /*
     * App cold-start state me NavigationContainer
     * ready nahi bhi ho sakta.
     */
    if (!navigationRef.isReady()) {
      console.log(
        'Navigation not ready, saving ticket temporarily',
      );

      pendingTicketData =
        routeParams;

      return;
    }

    await navigateToTicket(
      routeParams,
    );
  };


/*
 * App notification se completely closed state
 * se open hui ho to NavigationContainer ready
 * hone ke baad ye function call hota hai.
 */
export const openPendingTicket =
  async () => {

    if (
      !navigationRef.isReady() ||
      !pendingTicketData
    ) {
      return;
    }

    const ticketData =
      pendingTicketData;

    /*
     * Pehle clear kar do taaki same
     * notification dobara open na ho.
     */
    pendingTicketData = null;

    console.log(
      'Opening pending notification ticket:',
      ticketData,
    );

    await navigateToTicket(
      ticketData,
    );
  };