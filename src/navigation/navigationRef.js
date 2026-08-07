import {
  createNavigationContainerRef,
} from '@react-navigation/native';

export const navigationRef =
  createNavigationContainerRef();

let pendingTicketData = null;


/*
 * Notification se correct ticket open.
 */
export const openTicketFromNotification = data => {
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
    ticketId: String(data.ticketId),

    subject: String(
      data.ticketSubject ||
      'Ticket Details',
    ),

    threadId: String(
      data.threadId || '',
    ),

    fromNotification: true,
  };

  /*
   * Navigation ready nahi hai OR abhi Loading
   * screen chal rahi hai, to abhi navigate nahi karna.
   *
   * Loading login check complete hone ke baad
   * pending ticket kholegi.
   */
  const currentRoute =
    navigationRef.isReady()
      ? navigationRef.getCurrentRoute()
      : null;

  console.log(
    'Current route during notification:',
    currentRoute?.name,
  );

  if (
    !navigationRef.isReady() ||
    currentRoute?.name === 'Loading'
  ) {
    console.log(
      'Saving notification ticket until loading completes',
    );

    pendingTicketData =
      routeParams;

    return;
  }

  console.log(
    'Opening ViewTicketDetail directly:',
    routeParams,
  );

  navigationRef.navigate(
    'ViewTicketDetail',
    routeParams,
  );
};


/*
 * Check whether notification ticket pending hai.
 */
export const hasPendingTicket = () => {
  return Boolean(
    pendingTicketData?.ticketId,
  );
};


/*
 * Loading/login check complete hone ke baad
 * pending notification ticket open.
 *
 * true  = ticket open hua
 * false = pending notification nahi thi
 */
export const openPendingTicket = () => {
  if (
    !navigationRef.isReady() ||
    !pendingTicketData
  ) {
    return false;
  }

  const routeParams =
    pendingTicketData;

  pendingTicketData = null;

  console.log(
    'Opening pending notification ticket:',
    routeParams,
  );

  navigationRef.navigate(
    'ViewTicketDetail',
    routeParams,
  );

  return true;
};