import {
  createNavigationContainerRef,
} from '@react-navigation/native';

export const navigationRef =
  createNavigationContainerRef();


export const openTicketFromNotification =
  data => {

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


    if (
      !navigationRef.isReady()
    ) {

      console.log(
        'Navigation not ready',
      );

      return;
    }


    const routeParams = {

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

    };


    console.log(
      'Opening ViewTicketDetail:',
      routeParams,
    );


    navigationRef.navigate(
      'ViewTicketDetail',
      routeParams,
    );
  };