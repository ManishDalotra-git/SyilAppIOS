require('dotenv').config();


const {
  initializeApp,
  cert,
  getApps,
} = require('firebase-admin/app');

const { getMessaging } = require(
  'firebase-admin/messaging',
);

if (!process.env.FIREBASE_ADMIN_SDK) {
  throw new Error(
    'FIREBASE_ADMIN_SDK environment variable is missing',
  );
}

const firebaseServiceAccount = JSON.parse(
  process.env.FIREBASE_ADMIN_SDK,
);

if (getApps().length === 0) {
  initializeApp({
    credential: cert(firebaseServiceAccount),
  });
}

console.log('Firebase Admin initialized');


const express = require('express');
const bodyParser = require('body-parser');

const path = require('path');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const multer = require('multer');
const { send } = require('process');
const hubspotUpload = multer({
  dest: 'uploads/'
});

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log('api--- ', HUBSPOT_API_KEY);
console.log('OPENAI_API_KEY--- ', OPENAI_API_KEY);





app.post('/ask-alex', async (req, res) => {
  const { question } = req.body;
  console.log('question---- ', question);
  try {
    // const { question } = req.body;
     console.log('question----try00 ', question);
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const response = await axios.post(
      'https://api.openai.com/v1/responses',
      {
        model: 'gpt-5-mini',
        tools: [{ type: 'web_search' }],
        input: [
          {
            role: 'system',
            content:`
              You are "Alex", a professional AI support assistant for SYIL.

              ========================
              CORE KNOWLEDGE RULES
              ========================
              - Answer ONLY using information available on:
                • https://syil.com
                • https://syil.com/dealer-portal
              - Do NOT use external knowledge, assumptions, or general CNC information.
              - If requested information is not available on the official SYIL websites, say so clearly and politely.

              ========================
              GREETING & SMALL TALK
              ========================
              - If the user says "hi", "hello", "hey":
                Respond:
                "Hello! Welcome to SYIL Support. I'm Alex, your AI assistant 🙂.\n\nHow are you today? How may I assist you?"

              - If the user asks "how are you", "how are you doing":
                Respond professionally and friendly:
                "I'm doing well, thank you for asking. How are you today? How may I assist you?"

              - Do NOT include key features, machines, or product details in greeting or small talk responses.

              ========================
              SYIL / MACHINE / PRODUCT QUESTIONS
              ========================
              - ONLY when the user asks about:
                • SYIL as a company
                • CNC machines
                • Specific models (X5, X7, X9, X11, L-series, G2, R1, etc.)
                • Capabilities, specifications, or use cases
              - Then:
                - Provide a clear, accurate, and professional response.
                - Include a clearly labeled **"Key Features"** section in bullet points.
                - Ensure every feature is sourced from official SYIL website content.
                - Do not exaggerate or add marketing claims.

              ========================
              DEALER PORTAL & RESTRICTED INFO
              ========================
              - If the user asks about:
                • Pricing
                • Dealer access
                • Private documents
                • Restricted resources
              - Respond that this information is available through authorized dealers only.
              - Guide the user to the SYIL Dealer Portal.
              - Never guess or invent confidential information.

              ========================
              CLARIFICATION RULE
              ========================
              - If the user's question is unclear or incomplete, ask ONE short clarification question before answering.

              ========================
              TONE & STYLE
              ========================
              - Professional, polite, and friendly.
              - Clear and structured responses.
              - Use bullet points for features.
              - Avoid unnecessary verbosity or casual slang.

              ========================
              FALLBACK RULE
              ========================
              - If the question is unrelated to SYIL or not covered on the official websites:
                Respond:
                "This information is not available on the official SYIL website. Please contact SYIL support or an authorized dealer for further assistance."
              `
          },
          {
            role: 'user',
            content: question
          }
        ],
        text: {
          format: { type: 'text' }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    // 🔹 Extract message block
    const messageBlock = response.data.output.find(
      o => o.type === 'message'
    );

    const content = messageBlock?.content?.[0] || {};
    const text = content.text || '';
    const annotations = content.annotations || [];

    // 🔹 Only FIRST title
    const title =
      annotations.length > 0 && annotations[0].title
        ? annotations[0].title
        : '';


        console.log('content---- ', content);
        console.log('text---- ', text);
        console.log('annotations---- ', annotations);
        console.log('title---- ', title);

    return res.json({
      title,
      text
    });

  } catch (error) {
    console.error('OpenAI Error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to fetch answer from OpenAI'
    });
  }
});


app.get('/articles', (req, res) => {
  const filePath = path.join(__dirname, 'assets', 'articles.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to read articles' });
    }

    try {
      const json = JSON.parse(data);
      res.json(json);
    } catch (e) {
      res.status(500).json({ message: 'Invalid JSON format' });
    }
  });
});


 






// storage config for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // temporary folder
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/json') {
      return cb(new Error('Only JSON files are allowed'));
    }
    cb(null, true);
  }
});

// endpoint to upload JSON
app.post('/upload-articles', upload.single('file'), (req, res) => {
  const tempPath = req.file.path;
  const targetPath = path.join(__dirname, 'assets', 'articles.json');

  fs.readFile(tempPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Error reading file' });

    // optional: validate JSON
    try {
      JSON.parse(data);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid JSON file' });
    }

    fs.writeFile(targetPath, data, 'utf8', (err) => {
      if (err) return res.status(500).json({ message: 'Error saving file' });

      // delete temp file
      fs.unlinkSync(tempPath);

      res.json({ message: 'articles.json updated successfully' });
    });
  });
});





app.post(
  '/save-dealer-fcm-token',
  async (req, res) => {
    const {
      email,
      fcmToken,
      platform,
    } = req.body;

    if (!email || !fcmToken) {
      return res.status(400).json({
        success: false,
        message:
          'Email and FCM token are required',
      });
    }

    try {
      const fetch = (...args) =>
        import('node-fetch').then(
          ({ default: fetch }) => fetch(...args),
        );

      /*
       * Find HubSpot contact.
       */
      const searchResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          method: 'POST',
          headers: {
            Authorization:
              `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: 'email',
                    operator: 'EQ',
                    value: email
                      .trim()
                      .toLowerCase(),
                  },
                ],
              },
            ],
            properties: [
              'email',
              'dealer_fcm_token',
            ],
            limit: 1,
          }),
        },
      );

      const searchData =
        await searchResponse.json();

      if (!searchResponse.ok) {
        console.error(
          'HubSpot contact search error:',
          searchData,
        );

        return res.status(searchResponse.status).json({
          success: false,
          message:
            'Unable to search HubSpot contact',
          detail: searchData,
        });
      }

      if (!searchData.results?.length) {
        return res.status(404).json({
          success: false,
          message: 'HubSpot contact not found',
        });
      }

      const contactId =
        searchData.results[0].id;


 /*
 * =====================================================
 * SAME DEVICE TOKEN CLEANUP
 * =====================================================
 */

let tokenSearchAfter = null;
let contactsWithDealerToken = [];

do {
  const tokenContactsResponse =
    await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${HUBSPOT_API_KEY}`,

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName:
                    'dealer_fcm_token',

                  operator:
                    'HAS_PROPERTY',
                },
              ],
            },
          ],

          properties: [
            'email',
            'dealer_fcm_token',
          ],

          limit: 100,

          ...(tokenSearchAfter
            ? {
                after:
                  tokenSearchAfter,
              }
            : {}),
        }),
      },
    );

  const tokenContactsData =
    await tokenContactsResponse.json();

  if (!tokenContactsResponse.ok) {
    console.error(
      'Contacts-with-token search failed:',
      tokenContactsData,
    );

    break;
  }

  contactsWithDealerToken = [
    ...contactsWithDealerToken,
    ...(tokenContactsData.results || []),
  ];

  tokenSearchAfter =
    tokenContactsData?.paging
      ?.next
      ?.after || null;

} while (tokenSearchAfter);


/*
 * Same exact FCM token wale contacts,
 * current logged-in contact ko chhod kar.
 */
const oldContacts =
  contactsWithDealerToken.filter(
    contact => {

      const savedToken =
        String(
          contact.properties
            ?.dealer_fcm_token ||
            '',
        ).trim();

      return (
        String(contact.id) !==
          String(contactId) &&
        savedToken ===
          String(fcmToken).trim()
      );
    },
  );


console.log(
  'Same FCM token found on old contacts:',
  oldContacts.map(
    contact => ({
      contactId:
        contact.id,

      email:
        contact.properties
          ?.email || '',
    }),
  ),
);


/*
 * remove token from old contacts, if any.
 */
for (const oldContact of oldContacts) {

  const clearResponse =
    await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${oldContact.id}`,
      {
        method: 'PATCH',

        headers: {
          Authorization:
            `Bearer ${HUBSPOT_API_KEY}`,

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          properties: {
            dealer_fcm_token: '',
          },
        }),
      },
    );

  const clearText =
    await clearResponse.text();

  if (!clearResponse.ok) {
    console.error(
      `FCM token remove failed for ${oldContact.properties?.email || oldContact.id}:`,
      clearText,
    );

    continue;
  }

  console.log(
    `Old FCM token successfully removed from ${oldContact.properties?.email || oldContact.id}`,
  );
}



      /*
       * Save Dealer app FCM token.
       */
      const updateResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization:
              `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: {
              dealer_fcm_token: fcmToken,
            },
          }),
        },
      );

      const updateText =
        await updateResponse.text();

      let updateData = {};

      try {
        updateData = updateText
          ? JSON.parse(updateText)
          : {};
      } catch {
        updateData = {
          rawResponse: updateText,
        };
      }

      if (!updateResponse.ok) {
        console.error(
          'HubSpot token update error:',
          updateData,
        );

        return res.status(updateResponse.status).json({
          success: false,
          message:
            'Dealer FCM token could not be saved',
          detail: updateData,
        });
      }

      console.log(
        `Dealer FCM token saved for contact ${contactId}, platform ${platform || 'unknown'}`,
      );

      return res.status(200).json({
        success: true,
        message:
          'Dealer FCM token saved successfully',
        contactId,
        platform: platform || '',
      });
    } catch (error) {
      console.error(
        'Save dealer FCM token error:',
        error,
      );

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  },
);



const getDealerTotalUnreadCount =
  async (contactId, fetch) => {

    try {
      /*
       * Contact associated with tickets.
       */
      const associationResponse =
        await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/ticket`,
          {
            method: 'GET',
            headers: {
              Authorization:
                `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type':
                'application/json',
            },
          },
        );

      const associationData =
        await associationResponse.json();

      if (!associationResponse.ok) {
        console.error(
          'Unread total association error:',
          associationData,
        );

        return 0;
      }

      const ticketIds =
        (associationData.results || [])
          .map(item =>
            String(item.id),
          )
          .filter(Boolean);

      if (!ticketIds.length) {
        return 0;
      }

      /*
       * Get each associated ticket
       * customer_portal + dealer_unread_count.
       */
      const ticketRequests =
        ticketIds.map(
          async associatedTicketId => {

            const response =
              await fetch(
                `https://api.hubapi.com/crm/v3/objects/tickets/${associatedTicketId}?properties=customer_portal,dealer_unread_count`,
                {
                  method: 'GET',
                  headers: {
                    Authorization:
                      `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type':
                      'application/json',
                  },
                },
              );

            const data =
              await response.json();

            if (!response.ok) {
              console.error(
                `Unread ticket ${associatedTicketId} fetch failed:`,
                data,
              );

              return null;
            }

            return data;
          },
        );

      const tickets =
        (
          await Promise.all(
            ticketRequests,
          )
        ).filter(Boolean);

      /*
       * customer_portal true tickets
       * Dealer App total not include
       */
      const dealerTickets =
        tickets.filter(ticket => {

          const rawCustomerPortal =
            ticket.properties
              ?.customer_portal;

          const normalized =
            String(
              rawCustomerPortal ?? '',
            )
              .trim()
              .toLowerCase();

          const isCustomerPortal =
            rawCustomerPortal === true ||
            normalized === 'true' ||
            normalized === 'yes' ||
            normalized === '1';

          return !isCustomerPortal;
        });

      const totalUnreadCount =
        dealerTickets.reduce(
          (total, ticket) => {

            const count =
              Number(
                ticket.properties
                  ?.dealer_unread_count ||
                  0,
              );

            return (
              total +
              (
                Number.isFinite(count)
                  ? count
                  : 0
              )
            );
          },
          0,
        );

      console.log(
        `Total Dealer unread for contact ${contactId}:`,
        totalUnreadCount,
      );

      return totalUnreadCount;

    } catch (error) {
      console.error(
        'getDealerTotalUnreadCount error:',
        error,
      );

      return 0;
    }
  };



  const getSupportOwnerTotalUnreadCount =

  async (
    ownerId,
    fetch,
  ) => {
    try {
      let allTickets = [];
      let after = null;
      do {
        const response =
          await fetch(
            'https://api.hubapi.com/crm/v3/objects/tickets/search',
            {
              method:
                'POST',
              headers: {
                Authorization:
                  `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify({
                  filterGroups: [
                    {
                      filters: [
                        {
                          propertyName:
                            'hubspot_owner_id',
                          operator:
                            'EQ',
                          value:
                            String(
                              ownerId,
                            ),
                        },
                      ],
                    },
                  ],

                  properties: [
                    'customer_portal',
                    'dealer_unread_count',
                  ],

                  limit:
                    100,
                  ...(after
                    ? { after }
                    : {}),
                }),
            },
          );

        const data =
          await response.json();
        if (!response.ok) {
          console.error(
            'Support unread ticket search failed:',
            data,
          );

          return 0;
        }

        allTickets = [
          ...allTickets,
          ...(data.results || []),
        ];


        after =
          data?.paging
            ?.next
            ?.after ||
          null;

      } while (after);

      const totalUnread =
        allTickets.reduce(
          (
            total,
            ticket,
          ) => {
            const rawPortal =
              String(
                ticket.properties
                  ?.customer_portal ||
                  '',
              )
                .trim()
                .toLowerCase();

            const isCustomerPortal =
              rawPortal ===
                'true' ||
              rawPortal ===
                'yes' ||
              rawPortal ===
                '1';


            if (isCustomerPortal) {
              return total;
            }

            const unread =
              Number(
                ticket.properties
                  ?.dealer_unread_count ||
                  0,
              );

            return (
              total +
              (
                Number.isFinite(
                  unread,
                )
                  ? unread
                  : 0
              )
            );
          },
          0,
        );


      console.log(
        `Support Owner ${ownerId} total unread:`,
        totalUnread,
      );

      return totalUnread;
    } catch (error) {
      console.error(
        'getSupportOwnerTotalUnreadCount error:',
        error,
      );
      return 0;
    }
  };

app.post('/hubspot-webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    console.log(
      '========== HUBSPOT WEBHOOK RECEIVED ==========',
    );
    console.log(
      'Webhook body:',
      JSON.stringify(req.body, null, 2),
    );
    const events = Array.isArray(req.body)
      ? req.body
      : [];

    if (!events.length) {
      console.log('Webhook body is empty');
      return;
    }

    const event = events[0];

    const threadId = event.objectId;
    const webhookMessageId = event.messageId;

    console.log('Thread ID:', threadId);
    console.log(
      'Webhook Message ID:',
      webhookMessageId,
    );
    console.log(
      'Subscription Type:',
      event.subscriptionType,
    );

    if (!threadId || !webhookMessageId) {
      console.log(
        'Thread ID or webhook message ID missing',
      );
      return;
    }

    const fetch = (...args) =>
      import('node-fetch').then(
        ({ default: fetch }) => fetch(...args),
      );

    /*
     * =====================================================
     * STEP 1: Current thread messages fetch
     * =====================================================
     */

    const messagesResponse = await fetch(
      `https://api.hubapi.com/conversations/v3/conversations/threads/${threadId}/messages`,
      {
        method: 'GET',
        headers: {
          Authorization:
            `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const messagesData =
      await messagesResponse.json();

    console.log(
      'HubSpot messages status:',
      messagesResponse.status,
    );

    if (!messagesResponse.ok) {
      console.error(
        'HubSpot messages API error:',
        JSON.stringify(messagesData, null, 2),
      );
      return;
    }

    const availableMessages =
      messagesData.results || [];

    const latestMessage =
      availableMessages.find(
        message =>
          message.type === 'MESSAGE' &&
          String(message.id) ===
            String(webhookMessageId),
      );

    if (!latestMessage) {
      console.log(
        'Exact webhook message not found in thread',
      );
      return;
    }

    console.log(
      'Matched message direction:',
      latestMessage.direction,
    );

    console.log(
      'Matched message text:',
      latestMessage.text,
    );

    
    const allowedDirections = [
      'INCOMING',
      'OUTGOING',
    ];

    if (
      !allowedDirections.includes(
        latestMessage.direction,
      )
    ) {
      console.log(
        `Notification skipped because direction is ${latestMessage.direction}`,
      );
      return;
    }

    /*
     * =====================================================
     * STEP 2: find the thread associated with ticket
     * =====================================================
     */

    const ticketSearchResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/tickets/search',
      {
        method: 'POST',
        headers: {
          Authorization:
            `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName:
                    'hs_conversations_originating_thread_id',
                  operator: 'EQ',
                  value: String(threadId),
                },
              ],
            },
          ],
          properties: [
            'subject',
            'customer_portal',
            'hs_conversations_originating_thread_id',
            'dealer_unread_count',
            'hubspot_owner_id',
          ],
          limit: 1,
        }),
      },
    );

    const ticketSearchData =
      await ticketSearchResponse.json();

    console.log(
      'Ticket search status:',
      ticketSearchResponse.status,
    );

    if (!ticketSearchResponse.ok) {
      console.error(
        'Ticket search error:',
        JSON.stringify(
          ticketSearchData,
          null,
          2,
        ),
      );
      return;
    }

    if (!ticketSearchData.results?.length) {
      console.log(
        'No ticket found for thread:',
        threadId,
      );
      return;
    }

    const matchedTicket =
      ticketSearchData.results[0];

    const ticketId =
      String(matchedTicket.id);

    const ticketSubject =
      matchedTicket.properties?.subject || '';

    const ticketOwnerId =
      String(
        matchedTicket.properties
          ?.hubspot_owner_id ||
          '',
      );

    console.log(
      'Ticket HubSpot Owner ID:',
      ticketOwnerId || 'Not assigned',
    );

    const rawCustomerPortal =
      matchedTicket.properties
        ?.customer_portal;

    const normalizedCustomerPortal =
      String(rawCustomerPortal ?? '')
        .trim()
        .toLowerCase();

    const isCustomerPortalTicket =
      rawCustomerPortal === true ||
      normalizedCustomerPortal === 'true' ||
      normalizedCustomerPortal === 'yes' ||
      normalizedCustomerPortal === '1';

    console.log(
      'Matched Ticket ID:',
      ticketId,
    );

    console.log(
      'Ticket Subject:',
      ticketSubject,
    );

    console.log(
      'customer_portal raw value:',
      rawCustomerPortal,
    );

    console.log(
      'Is customer portal ticket:',
      isCustomerPortalTicket,
    );

    if (isCustomerPortalTicket) {
      console.log(
        'Dealer push skipped: customer_portal is true',
      );
      return;
    }

    console.log(
      'Dealer ticket confirmed',
    );



    /*
 * =====================================================
 * Ticket Owner identify
 * =====================================================
 */

let ticketOwnerEmail = '';

if (ticketOwnerId) {
  try {
    const ownerResponse =
      await fetch(
        `https://api.hubapi.com/crm/v3/owners/${ticketOwnerId}`,
        {
          method: 'GET',
          headers: {
            Authorization:
              `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type':
              'application/json',
          },
        },
      );

    const ownerData =
      await ownerResponse.json();

    if (ownerResponse.ok) {
      ticketOwnerEmail =
        ownerData.email
          ?.trim()
          ?.toLowerCase() || '';

      console.log(
        'Ticket Owner Email:',
        ticketOwnerEmail ||
          'Not available',
      );
    } else {
      console.error(
        'Ticket owner fetch failed:',
        ownerData,
      );
    }
  } catch (error) {
    console.error(
      'Ticket owner fetch error:',
      error,
    );
  }
}



    /*
 * =====================================================
 * Current Ticket unread count +1
 * =====================================================
 */

const currentTicketUnreadCount =
  Number(
    matchedTicket.properties
      ?.dealer_unread_count ||
      0,
  );

const newTicketUnreadCount =
  currentTicketUnreadCount + 1;

console.log(
  `Ticket ${ticketId} unread: ${currentTicketUnreadCount} -> ${newTicketUnreadCount}`,
);

const ticketUnreadUpdateResponse =
  await fetch(
    `https://api.hubapi.com/crm/v3/objects/tickets/${ticketId}`,
    {
      method: 'PATCH',

      headers: {
        Authorization:
          `Bearer ${HUBSPOT_API_KEY}`,

        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        properties: {
          /*
           * dealer_unread_count Single-line text
           */
          dealer_unread_count:
            String(
              newTicketUnreadCount,
            ),
        },
      }),
    },
  );

const ticketUnreadUpdateText =
  await ticketUnreadUpdateResponse.text();

if (!ticketUnreadUpdateResponse.ok) {
  console.error(
    'Ticket unread count update failed:',
    ticketUnreadUpdateText,
  );

  return;
}

console.log(
  'Ticket unread count updated successfully:',
  newTicketUnreadCount,
);



    /*
     * =====================================================
     * STEP 3: Message sender identify
     * =====================================================
     */

    const senderEmail =
      latestMessage.senders?.[0]
        ?.deliveryIdentifier?.value
        ?.trim()
        ?.toLowerCase() || '';

    console.log(
      'Message sender email:',
      senderEmail || 'Not available',
    );

    /*
     * Sender contact app_support_team_member
     * property check.
     */
    let senderIsSupport = false;
    let senderContactName = '';
    let senderContactFound = false;

    if (senderEmail) {
      const senderSearchResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          method: 'POST',
          headers: {
            Authorization:
              `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: 'email',
                    operator: 'EQ',
                    value: senderEmail,
                  },
                ],
              },
            ],
            properties: [
              'email',
              'firstname',
              'lastname',
              'app_support_team_member',
            ],
            limit: 1,
          }),
        },
      );

      const senderSearchData =
        await senderSearchResponse.json();

      console.log(
        'Sender contact search status:',
        senderSearchResponse.status,
      );

      if (!senderSearchResponse.ok) {
        console.error(
          'Sender contact search error:',
          JSON.stringify(
            senderSearchData,
            null,
            2,
          ),
        );
      } else if (
        senderSearchData.results?.length
      ) {
        senderContactFound = true;

        const senderContact =
          senderSearchData.results[0];

        const supportValue =
          String(
            senderContact.properties
              ?.app_support_team_member ??
              '',
          )
            .trim()
            .toLowerCase();

        /*
         * if app_support_team_member = yes it means support team member.
         * No / empty / missing it means customer.
         */
        senderIsSupport =
          supportValue === 'yes';

        senderContactName = [
          senderContact.properties
            ?.firstname,
          senderContact.properties
            ?.lastname,
        ]
          .filter(Boolean)
          .join(' ');

        console.log(
          'app_support_team_member:',
          supportValue || 'empty',
        );
      } else {
        console.log(
          'Sender contact not found in HubSpot',
        );
      }
    }

    /*
     * if sender contact not found, use direction as fallback:
     * OUTGOING = support
     * INCOMING = customer
     */
    if (!senderContactFound) {
      senderIsSupport =
        latestMessage.direction ===
        'OUTGOING';

      console.log(
        'Using message direction as sender-role fallback',
      );
    }

    senderIsSupport =
  latestMessage.direction === 'OUTGOING';

    const senderRole =
      senderIsSupport
        ? 'support'
        : 'customer';

    const senderName =
      senderContactName ||
      latestMessage.senders?.[0]?.name ||
      senderEmail ||
      (senderIsSupport
        ? 'SYIL Support'
        : 'Customer');

    const notificationTitle =
      senderIsSupport
        ? `New reply from ${senderName}`
        : `New message from ${senderName}`;

    const notificationBody =
      latestMessage.text?.trim() ||
      (senderIsSupport
        ? 'You received a new reply from SYIL Support.'
        : 'You received a new customer message.');

    console.log(
      'Sender role:',
      senderRole,
    );

    console.log(
      'Sender name:',
      senderName,
    );

    console.log(
      'Notification title:',
      notificationTitle,
    );

let dealerRecipients = [];

/*
 * =====================================================
 * CASE 1:
 * Customer replied -> Ticket Owner get notification
 * =====================================================
 */
if (latestMessage.direction === 'INCOMING') {

  console.log(
    'Incoming customer message: finding Ticket Owner',
  );

  if (!ticketOwnerEmail) {
    console.log(
      'Push skipped: Ticket owner email missing',
    );

    return;
  }


  const ownerContactSearchResponse =
    await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${HUBSPOT_API_KEY}`,

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName:
                    'email',

                  operator:
                    'EQ',

                  value:
                    ticketOwnerEmail,
                },
              ],
            },
          ],

          properties: [
            'email',
            'firstname',
            'lastname',
            'app_support_team_member',
            'dealer_fcm_token',
          ],

          limit: 1,
        }),
      },
    );


  const ownerContactSearchData =
    await ownerContactSearchResponse.json();


  if (!ownerContactSearchResponse.ok) {
    console.error(
      'Ticket owner contact search failed:',
      ownerContactSearchData,
    );

    return;
  }


  const ownerContact =
    ownerContactSearchData
      .results?.[0];


  if (!ownerContact) {
    console.log(
      `Push skipped: Contact not found for owner ${ticketOwnerEmail}`,
    );

    return;
  }


  const supportValue =
    String(
      ownerContact.properties
        ?.app_support_team_member ||
        '',
    )
      .trim()
      .toLowerCase();


  const token =
    ownerContact.properties
      ?.dealer_fcm_token;


  if (supportValue !== 'yes') {
    console.log(
      `Push skipped: Ticket owner ${ticketOwnerEmail} is not support team member`,
    );

    return;
  }


  if (!token) {
    console.log(
      `Push skipped: Ticket owner ${ticketOwnerEmail} has no FCM token`,
    );

    return;
  }


  dealerRecipients = [
    {
      contactId:
        String(ownerContact.id),

      email:
        String(
          ownerContact.properties
            ?.email || '',
        )
          .trim()
          .toLowerCase(),

      token,

      recipientType:
        'support',

      ownerId:
        String(
          ticketOwnerId,
        ),
    },
  ];
}


/*
 * =====================================================
 * CASE 2:
 * Support replied -> Associated Customer(s)
 * =====================================================
 */
else if (
  latestMessage.direction === 'OUTGOING'
) {

  console.log(
    'Outgoing support message: finding associated customer contacts',
  );


  const ticketContactsResponse =
    await fetch(
      `https://api.hubapi.com/crm/v3/objects/tickets/${ticketId}/associations/contacts`,
      {
        method: 'GET',

        headers: {
          Authorization:
            `Bearer ${HUBSPOT_API_KEY}`,

          'Content-Type':
            'application/json',
        },
      },
    );


  const ticketContactsData =
    await ticketContactsResponse.json();


  if (!ticketContactsResponse.ok) {
    console.error(
      'Ticket contact association fetch failed:',
      ticketContactsData,
    );

    return;
  }


  const associatedContactIds =
    (
      ticketContactsData.results ||
      []
    )
      .map(item =>
        String(item.id),
      )
      .filter(Boolean);


  if (!associatedContactIds.length) {
    console.log(
      'Push skipped: No customer associated with ticket',
    );

    return;
  }


  const contactRequests =
    associatedContactIds.map(
      async contactId => {

        const response =
          await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,app_support_team_member,dealer_fcm_token`,
            {
              method: 'GET',

              headers: {
                Authorization:
                  `Bearer ${HUBSPOT_API_KEY}`,

                'Content-Type':
                  'application/json',
              },
            },
          );


        const data =
          await response.json();


        if (!response.ok) {
          return null;
        }


        return data;
      },
    );


  const contacts =
    (
      await Promise.all(
        contactRequests,
      )
    ).filter(Boolean);


  dealerRecipients =
    contacts
      .filter(contact => {

        const supportValue =
          String(
            contact.properties
              ?.app_support_team_member ||
              '',
          )
            .trim()
            .toLowerCase();


        /*
         * Customer/non-support contacts only.
         */
        const isSupport =
          supportValue === 'yes';


        const hasToken =
          Boolean(
            contact.properties
              ?.dealer_fcm_token,
          );


        return (
          !isSupport &&
          hasToken
        );
      })

      .map(contact => ({
        contactId:
          String(
            contact.id,
          ),

        email:
          String(
            contact.properties
              ?.email || '',
          )
            .trim()
            .toLowerCase(),

        token:
          contact.properties
            ?.dealer_fcm_token,

        recipientType:
          'customer',
      }));
}


console.log(
  'Dealer notification recipients:',
  dealerRecipients.map(
    recipient => ({
      contactId:
        recipient.contactId,

      email:
        recipient.email,

      recipientType:
        recipient.recipientType,
    }),
  ),
);


if (!dealerRecipients.length) {
  console.log(
    'Push skipped: No eligible recipient',
  );

  return;
}

console.log(
  'Dealer notification recipients:',
  dealerRecipients.map(
    recipient => ({
      contactId:
        recipient.contactId,

      email:
        recipient.email,
    }),
  ),
);


    /*
     * =====================================================
     * STEP 5: Send Push notification
     * =====================================================
     */


  const pushResults =
  await Promise.allSettled(

    dealerRecipients.map(
      async recipient => {

      let totalUnreadCount = 0;

      if (
        recipient.recipientType ===
        'support'
      ) {

        totalUnreadCount =
          await getSupportOwnerTotalUnreadCount(
            recipient.ownerId,
            fetch,
          );
      }


  else {

    totalUnreadCount =
      await getDealerTotalUnreadCount(
        recipient.contactId,
        fetch,
      );
  }
          console.log(
            `Push badge for ${recipient.email}:`,
            totalUnreadCount,
          );

          return getMessaging().send({
            token:
              recipient.token,
            notification: {
              title:
                notificationTitle,
              body:
                notificationBody.slice(
                  0,
                  200,
                ),
            },
            data: {
              ticketId:
                String(ticketId),
              threadId:
                String(threadId),
              messageId:
                String(
                  latestMessage.id,
                ),
              ticketSubject:
                String(
                  ticketSubject,
                ),
              senderEmail:
                String(
                  senderEmail,
                ),
              senderRole:
                String(
                  senderRole,
                ),
              appSupportTeamMember:
                senderIsSupport
                  ? 'Yes'
                  : 'No',
              direction:
                String(
                  latestMessage.direction,
                ),
              targetScreen:
                'ViewTicketDetail',
              type:
                senderIsSupport
                  ? 'support_message'
                  : 'customer_message',

              /*
              * Specific ticket unread.
              */
              ticketUnreadCount:
                String(
                  newTicketUnreadCount,
                ),

              /*
              * App icon total unread.
              */
              totalUnreadCount:
                String(
                  totalUnreadCount,
                ),
            },

            apns: {
              headers: {
                'apns-priority':
                  '10',
              },

              payload: {
                aps: {
                  alert: {
                    title:
                      notificationTitle,

                    body:
                      notificationBody.slice(
                        0,
                        200,
                      ),
                  },

                  sound:
                    'default',

                  /*
                  * iPhone App icon badge.
                  */
                  badge:
                    totalUnreadCount,
                },
              },
            },
          });
        },
      ),
    );

    pushResults.forEach(
      (result, index) => {
        if (
          result.status ===
          'fulfilled'
        ) {
          console.log(
            `Push ${index + 1} success:`,
            result.value,
          );
        } else {
          console.error(
            `Push ${index + 1} failed:`,
            {
              code:
                result.reason?.code,
              message:
                result.reason?.message,
            },
          );
        }
      },
    );

    const successCount =
      pushResults.filter(
        result =>
          result.status ===
          'fulfilled',
      ).length;

    const failureCount =
      pushResults.length -
      successCount;

    console.log(
      '========== PUSH SUMMARY ==========',
    );

    console.log(
      'Successful:',
      successCount,
    );

    console.log(
      'Failed:',
      failureCount,
    );
  } catch (error) {
    console.error(
      'HubSpot webhook processing error:',
      {
        code: error?.code,
        message: error?.message,
        stack: error?.stack,
      },
    );
  }
});


app.post(
  '/mark-ticket-read',
  async (req, res) => {

    const {
      ticketId,
      contactId,
    } = req.body;

    if (!ticketId || !contactId) {
      return res.status(400).json({
        success: false,
        message:
          'ticketId and contactId are required',
      });
    }

    try {
      const fetch = (...args) =>
        import('node-fetch').then(
          ({ default: fetch }) =>
            fetch(...args),
        );

      /*
       * Confirm ticket is associated
       * with this logged-in contact.
       */
      const associationResponse =
        await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/ticket`,
          {
            method: 'GET',
            headers: {
              Authorization:
                `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type':
                'application/json',
            },
          },
        );

      const associationData =
        await associationResponse.json();

      if (!associationResponse.ok) {
        return res.status(
          associationResponse.status,
        ).json({
          success: false,
          message:
            'Unable to verify ticket association',
        });
      }

      const associatedTicketIds =
  (associationData.results || [])
    .map(item =>
      String(item.id),
    );

const isAssociatedContact =
  associatedTicketIds.includes(
    String(ticketId),
  );

console.log(
  'Ticket associated with logged-in contact:',
  isAssociatedContact,
);


let isTicketOwner = false;

if (!isAssociatedContact) {

  const loggedInContactResponse =
    await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=email`,
      {
        method: 'GET',
        headers: {
          Authorization:
            `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type':
            'application/json',
        },
      },
    );

  const loggedInContactData =
    await loggedInContactResponse.json();

  if (loggedInContactResponse.ok) {

    const loggedInEmail =
      loggedInContactData.properties
        ?.email
        ?.trim()
        ?.toLowerCase() || '';

    console.log(
      'Logged-in email for owner validation:',
      loggedInEmail,
    );

    /*
     * HubSpot owners fetch.
     */
    const ownersResponse =
      await fetch(
        'https://api.hubapi.com/crm/v3/owners?archived=false',
        {
          method: 'GET',
          headers: {
            Authorization:
              `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type':
              'application/json',
          },
        },
      );

    const ownersData =
      await ownersResponse.json();

    if (ownersResponse.ok) {

      const matchedOwner =
        (ownersData.results || [])
          .find(
            owner =>
              owner.email
                ?.trim()
                ?.toLowerCase() ===
              loggedInEmail,
          );

      if (matchedOwner) {

        const loggedInOwnerId =
          String(matchedOwner.id);

        console.log(
          'Logged-in HubSpot Owner ID:',
          loggedInOwnerId,
        );

        /*
         * Fetch Current ticket owner.
         */
        const ticketOwnerResponse =
          await fetch(
            `https://api.hubapi.com/crm/v3/objects/tickets/${ticketId}?properties=hubspot_owner_id`,
            {
              method: 'GET',
              headers: {
                Authorization:
                  `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type':
                  'application/json',
              },
            },
          );

        const ticketOwnerData =
          await ticketOwnerResponse.json();

        if (ticketOwnerResponse.ok) {

          const ticketOwnerId =
            String(
              ticketOwnerData.properties
                ?.hubspot_owner_id ||
                '',
            );

          isTicketOwner =
            ticketOwnerId ===
            loggedInOwnerId;

          console.log(
            'Ticket Owner ID:',
            ticketOwnerId,
          );

          console.log(
            'Logged user owns ticket:',
            isTicketOwner,
          );
        }
      }
    }
  }
}


if (
  !isAssociatedContact &&
  !isTicketOwner
) {
  return res.status(403).json({
    success: false,
    message:
      'User does not have access to this ticket',
  });
}



      /*
       * This ticket is now read.
       */
      const updateResponse =
        await fetch(
          `https://api.hubapi.com/crm/v3/objects/tickets/${ticketId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization:
                `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              properties: {
                dealer_unread_count: '0',
              },
            }),
          },
        );

      const updateText =
        await updateResponse.text();

      if (!updateResponse.ok) {
        console.error(
          'Mark ticket read error:',
          updateText,
        );

        return res.status(
          updateResponse.status,
        ).json({
          success: false,
          message:
            'Unable to mark ticket read',
        });
      }

      /*
       * Remaining total unread
       * across all dealer tickets.
       */
 
      let totalUnreadCount = 0;

if (isTicketOwner && !isAssociatedContact) {

  const loggedInContactResponse =
    await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=email`,
      {
        headers: {
          Authorization:
            `Bearer ${HUBSPOT_API_KEY}`,
        },
      },
    );

  const loggedInContactData =
    await loggedInContactResponse.json();

  const loggedInEmail =
    loggedInContactData.properties
      ?.email
      ?.trim()
      ?.toLowerCase() || '';


  const ownersResponse =
    await fetch(
      'https://api.hubapi.com/crm/v3/owners?archived=false',
      {
        headers: {
          Authorization:
            `Bearer ${HUBSPOT_API_KEY}`,
        },
      },
    );

  const ownersData =
    await ownersResponse.json();

  const matchedOwner =
    (ownersData.results || [])
      .find(
        owner =>
          owner.email
            ?.trim()
            ?.toLowerCase() ===
          loggedInEmail,
      );


  if (matchedOwner) {

    const ownerUnreadResponse =
      await fetch(
        'https://api.hubapi.com/crm/v3/objects/tickets/search',
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${HUBSPOT_API_KEY}`,

            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            filterGroups: [
              {
                filters: [
                  {
                    propertyName:
                      'hubspot_owner_id',

                    operator:
                      'EQ',

                    value:
                      String(
                        matchedOwner.id,
                      ),
                  },
                ],
              },
            ],

            properties: [
              'dealer_unread_count',
              'customer_portal',
            ],

            limit: 100,
          }),
        },
      );

    const ownerUnreadData =
      await ownerUnreadResponse.json();


    if (ownerUnreadResponse.ok) {

      totalUnreadCount =
        (
          ownerUnreadData.results ||
          []
        ).reduce(
          (total, ticket) => {

            const portalValue =
              String(
                ticket.properties
                  ?.customer_portal ||
                  '',
              )
                .trim()
                .toLowerCase();

            const customerPortal =
              portalValue === 'true' ||
              portalValue === 'yes' ||
              portalValue === '1';

            if (customerPortal) {
              return total;
            }

            return (
              total +
              Number(
                ticket.properties
                  ?.dealer_unread_count ||
                  0,
              )
            );
          },

          0,
        );
    }
  }

} else {

  /*
   * Normal ViewTicket Contact user.
   */
  totalUnreadCount =
    await getDealerTotalUnreadCount(
      String(contactId),
      fetch,
    );
}


      console.log(
        `Ticket ${ticketId} marked read. Remaining unread:`,
        totalUnreadCount,
      );

      return res.json({
        success: true,
        ticketUnreadCount: 0,
        totalUnreadCount,
      });

    } catch (error) {
      console.error(
        'mark-ticket-read error:',
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          'Internal server error',
      });
    }
  },
);

app.post('/get-contact-id', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));

    // 1️⃣ SEARCH CONTACT
    const searchResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
          properties: ['email'],
        }),
      }
    );

    const searchData = await searchResponse.json();

    // ✅ Contact Found
    if (searchResponse.ok && searchData.results?.length > 0) {
      return res.json({
        contactId: searchData.results[0].id,
        created: false,
      });
    }

    // 2️⃣ CREATE CONTACT (IF NOT FOUND)
    const createResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            email: email,
            hubspot_owner_id: '86106481'
          },
        }),
      }
    );

    const createData = await createResponse.json();

    if (createResponse.ok) {
      return res.json({
        contactId: createData.id,
        created: true,
      });
    } else {
      return res.status(createResponse.status).json(createData);
    }

  } catch (error) {
    console.error('Contact Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// Step 2: Create ticket and associate with contact
const uploadedFiles = [];
app.post('/upload-to-hubspot', hubspotUpload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.json({ success: true, files: [] });
    }
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(file.path));
      formData.append('fileName', file.originalname);
      formData.append('folderId', '204201997753');
      formData.append(
        'options',
        JSON.stringify({ access: 'PUBLIC_INDEXABLE' })
      );
      const response = await axios.post(
        'https://api.hubapi.com/files/v3/files',
        formData,
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
            ...formData.getHeaders(),
          },
        }
      );
      uploadedFiles.push({
        id: response.data.id,
        url: response.data.url,
      });
      fs.unlinkSync(file.path);
    }
    res.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (err) {
    console.log(err.response?.data || err);
    res.status(500).json({ error: 'File upload failed' });
  }
});


app.post('/create-ticket', async (req, res) => {
  try {
    const { contactId, ticketData } = req.body;

    
    if (!ticketData) {
      return res.status(400).json({ error: 'ticketData missing' });
    }

    const {
      email,
      company,
      machineType,
      controller,
      serialNo,
      salesOrder,
      subject,
      description,
      priority,
      warranty,
      categories,
      files,
    } = ticketData;

    
    const categoryArray = Array.isArray(categories) ? categories : [];

    
    const fields = [
      { objectTypeId: '0-1', name: 'email', value: email || '' },

      { objectTypeId: '0-5', name: 'subject', value: subject || '' },
      { objectTypeId: '0-5', name: 'content', value: description || '' },
      { objectTypeId: '0-5', name: 'end_customer_name', value: company || '' },
      { objectTypeId: '0-5', name: 'machine_type', value: machineType || '' },
      { objectTypeId: '0-5', name: 'controller', value: controller || '' },
      { objectTypeId: '0-5', name: 'machine_serial_number', value: serialNo || '' },
      { objectTypeId: '0-5', name: 'sales_order_number', value: salesOrder || '' },
      {
        objectTypeId: '0-5',
        name: 'warranty',
        value: warranty ? 'true' : 'false',
      },
      {
        objectTypeId: '0-5',
        name: 'hs_ticket_priority',
        value: priority || 'LOW',
      },
      {
        objectTypeId: '0-5',
        name: 'hs_ticket_category',
        value: categoryArray.join(';') || '',
      },
      {
        objectTypeId: '0-5',
        name: 'source_status',
        value: 'Mobile',
      },
    ];

  

    console.log('uploadedFiles----- ', uploadedFiles);

    if ( uploadedFiles && uploadedFiles.length > 0 ) 
        {
          const fileIds = uploadedFiles.map(f => f.id);

          fields.push({
            objectTypeId: '0-5',
            name: 'hs_file_upload', 
            value: fileIds.join(';'),
          });
        }

    const formUrl = 'https://api.hsforms.com/submissions/v3/integration/submit/4392290/d3c790a4-c601-4a54-b826-0a5ca3f57428';


    console.log('fields---- ' , fields);

    const response = await axios.post(
      formUrl,
      { fields },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
      }
    );

    uploadedFiles.length = 0;
    console.log(response);
    console.log('HubSpot STATUS:', response.status);


    const fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));

    await new Promise(resolve => setTimeout(resolve, 15000));

    const searchResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
          properties: ['mobile_ticket_id'],
        }),
      }
    );

    const searchData = await searchResponse.json();

    const mobile_ticket_id =
      searchData?.results?.[0]?.properties?.mobile_ticket_id || null;

    /* ------------------ 3️⃣ FINAL RESPONSE ------------------ */

    return res.status(200).json({
      success: true,
      message: 'Ticket created successfully',
      contactId,
      mobile_ticket_id,
    });
    
    // return res.status(200).json({
    //   success: true,
    //   message: `Ticket created successfully ${response}`,
    // });

    


  } catch (err) {
    console.error(
      '❌ Error in /create-ticket:',
      err.response?.data || err.message
    );
    return res.status(500).json({ error: 'Ticket creation failed' });
  }
});

 
app.post('/get-user-data', async (req, res) => {
  const { email } = req.body;

  try {
    const searchResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
          properties: ['app_support_team_member'],
        }),
      }
    );

    const data = await searchResponse.json();

    if (!data.results.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      app_support_team_member:
        data.results[0].properties.app_support_team_member || '',
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});



app.post('/check_login_detail', async (req, res) => {
  const { email, password } = req.body;
  console.log('email---- ' , email);
  console.log(HUBSPOT_API_KEY);
  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password are required',
    });
  }

  try {
    const fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));

    
    const searchResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
          properties: ['email', 'mobile_password', 'firstname', 'lastname', 'profile_image', 'bio', 'phone', 'gender', 'app_support_team_member'],
        }),
      }
    );

    const searchData = await searchResponse.json();

    // EMAIL NOT FOUND
    if (!searchData.results || searchData.results.length === 0) {
      return res.status(401).json({
        message: 'Invalid email, please enter your valid email',
      });
    }

    // CONTACT FOUND
    const contact = searchData.results[0];
    const contactId = contact.id;
    const hubspotPassword = contact.properties.mobile_password;

    // PASSWORD NOT SET
    if (!hubspotPassword) {
      return res.status(401).json({
        message: 'Password not set for this account',
      });
    }

    // PASSWORD DOES NOT MATCH
    if (hubspotPassword !== password) {
      return res.status(401).json({
        message: 'Please enter a valid password',
      });
    }

    // LOGIN SUCCESS
    return res.status(200).json({
      message: 'Login successful',
      contactId: contactId,
      user: {
        email: contact.properties.email,
        firstName: contact.properties.firstname || '',
        lastName: contact.properties.lastname || '',
        profileImage: contact.properties.hs_avatar_url || '',
        bio: contact.properties.bio || '',
        phone: contact.properties.phone || '',
        gender: contact.properties.gender || '',
        app_support_team_member: contact.properties.app_support_team_member || '',
      },
    });

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
});



app.post('/forgot_password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));

    
    const searchResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                { propertyName: 'email', operator: 'EQ', value: email },
              ],
            },
          ],
          properties: ['email'],
        }),
      }
    );

    const searchData = await searchResponse.json();

    // Email not found
    if (!searchData.results || searchData.results.length === 0) {
      return res.status(404).json({ message: 'Please enter a valid email.' });
    }

    
    const formResponse = await fetch(
      'https://api.hsforms.com/submissions/v3/integration/submit/4392290/635124f0-b15f-40c2-9806-5405ca736690',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          fields: [
            {
              objectTypeId: '0-1',
              name: 'email',
              value: email,
            },
          ],
        }),
      }
    );

    if (!formResponse.ok) {
      const formError = await formResponse.text();
      console.error('Form submission error:', formError);
      return res.status(500).json({
        message: 'Failed to submit form. Please try again later.',
      });
    }

    // Success response
    return res.status(200).json({
      message:
        'Thank you for submitting the form. Please check your email to reset your password. If you do not see the email in your inbox, please check your spam or junk folder as well.',
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});




app.post('/submit-feedback', async (req, res) => {
  const { email, subject, message, rating } = req.body;

  console.log('req__body_____ ', req.body);

  if (!email || !subject) {
    return res.status(400).json({ error: 'Email and Subject are required' });
  }

  try {
    const fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));

    // -------- Step 1: Search contact --------
    const searchResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                { propertyName: 'email', operator: 'EQ', value: email },
              ],
            },
          ],
          properties: ['email'],
        }),
      }
    );

    const searchData = await searchResponse.json();

    if (!searchResponse.ok || !searchData.results?.length) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contactId = searchData.results[0].id;

    // -------- Step 2: Create Feedback object & associate with contact --------
    const HUBSPOT_FEEDBACK_OBJECT_ID = '2-56321597'; 

    const feedbackResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/${HUBSPOT_FEEDBACK_OBJECT_ID}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            subject: subject,
            what_went_wrong: message,
            rating: rating,
          },
          associations: [
            {
              to: { id: contactId },
              types: [{ associationCategory: 'USER_DEFINED', associationTypeId: 131 }]
            }
          ]
        })
      }
    );

    const feedbackData = await feedbackResponse.json();

    if (!feedbackResponse.ok) {
      return res.status(feedbackResponse.status).json(feedbackData);
    }

    res.json({ success: true, feedback: feedbackData, contactId });

  } catch (error) {
    console.error('Submit Feedback Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.post('/get-profile-by-email', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: 'Email is required',
    });
  }

  try {
    const fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));

    const response = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
          properties: [
            'email',
            'firstname',
            'lastname',
            'bio',
            'phone',
            'gender',
          ],
        }),
      }
    );

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const contact = data.results[0].properties;

    
    res.status(200).json({
      user: {
        email: contact.email || '',
        firstname: contact.firstname || '',
        lastname: contact.lastname || '',
        bio: contact.bio || '',
        phone: contact.phone || '',
        gender: contact.gender || '',
      },
    });

  } catch (error) {
    console.error('HubSpot API Error:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
});



app.post('/update-profile', async (req, res) => {
  const { contactId, firstName, lastName, bio, phone, gender, image } = req.body;

  try {
    const fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));

    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            firstname: firstName,
            lastname: lastName,
            bio,
            phone,
            gender,
            hs_avatar_url: image,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(400).json({ err });
    }

    res.json({
      success: true,
      user: { firstName, lastName, bio, phone, gender, profileImage: image },
    });

  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});



// app.post('/get_tickets', async (req, res) => {
//   const { contactId, type } = req.body;

//   if (!contactId) {
//     return res.status(400).json({
//       message: 'Contact ID is required',
//     });
//   }

//   try {
//     const fetch = (...args) =>
//       import('node-fetch').then(({ default: fetch }) => fetch(...args));

//     let ticketIds = [];

//     if (type === 'me') {

//       const associationResponse = await fetch(
//         `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/ticket`,
//         {
//           method: 'GET',
//           headers: {
//             'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
//             'Content-Type': 'application/json',
//           },
//         }
//       );

//       const associationData = await associationResponse.json();

//       if (associationData.results) {
//         ticketIds = associationData.results.map(item => item.id);
//       }
//     }

//     if (type === 'org') {

      
//       const contactRes = await fetch(
//         `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?associations=companies`,
//         {
//           method: 'GET',
//           headers: {
//             'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
//             'Content-Type': 'application/json',
//           },
//         }
//       );

//       const contactData = await contactRes.json();

//       const companies = contactData?.associations?.companies?.results || [];

//       // const company = companies.find(c => c.type === 'contact_to_company');
//       const company =
//   companies.find(c => c.id) || null;

//       if (!company) {
//         return res.status(200).json({ tickets: [] });
//       }

//       const companyId = company.id;

      
//       const companyRes = await fetch(
//         `https://api.hubapi.com/crm/v3/objects/companies/${companyId}?associations=tickets`,
//         {
//           method: 'GET',
//           headers: {
//             'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
//             'Content-Type': 'application/json',
//           },
//         }
//       );

//       const companyData = await companyRes.json();

//       const tickets = companyData?.associations?.tickets?.results || [];

//       ticketIds = tickets
//         .filter(t => t.type === 'company_to_ticket')
//         .map(t => t.id);
//     }

//     if (!ticketIds.length) {
//       return res.status(200).json({
//         message: 'No tickets found',
//         tickets: [],
//       });
//     }

//     // const ticketPromises = ticketIds.map(ticketId =>
//     //   fetch(
//     //     `https://api.hubapi.com/crm/v3/objects/tickets/${ticketId}?properties=subject,createdate,hubspot_owner_id,hs_pipeline_stage,customer_portal,dealer_unread_count`,
//     //     {
//     //       method: 'GET',
//     //       headers: {
//     //         'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
//     //         'Content-Type': 'application/json',
//     //       },
//     //     }
//     //   ).then(res => res.json())
//     // );

//     const ticketPromises = ticketIds.map(async ticketId => {

//     const response = await fetch(
//         `https://api.hubapi.com/crm/v3/objects/tickets/${ticketId}?properties=subject,createdate,hubspot_owner_id,hs_pipeline_stage,customer_portal,dealer_unread_count`,
//         {
//             method:'GET',
//             headers:{
//                 Authorization:`Bearer ${HUBSPOT_API_KEY}`,
//                 'Content-Type':'application/json'
//             }
//         }
//     );

//     if (!response.ok) {

//     console.log(
//         "Ticket fetch failed:",
//         ticketId,
//         response.status
//     );

//     console.log(await response.text());

//     return null;
// }

//     return await response.json();

// });

// const ticketResponses =
//   (await Promise.all(ticketPromises))
//     .filter(Boolean);

// const formattedTickets = ticketResponses
//   .filter(ticket => ticket.properties)
//   .map(ticket => ({
//     ticketId: ticket.id,
//     subject: ticket.properties.subject || '',
//     createdDate: ticket.properties.createdate || '',
//     ownerId: ticket.properties.hubspot_owner_id || '',
//     status: ticket.properties.hs_pipeline_stage || '',
//     customer_portal: ticket.properties.customer_portal || '',
//     dealer_unread_count: Number(
//       ticket.properties.dealer_unread_count || 0
//     ),
//   }));


//     return res.status(200).json({
//       tickets: formattedTickets,
//     });

//   } catch (error) {
//     console.error('Error:', error);
//     return res.status(500).json({
//       message: 'Internal server error',
//     });
//   }
// });





app.post('/get-my-tickets', async (req, res) => {

  const { contactId } = req.body;

  if (!contactId) {
    return res.status(400).json({
      message: 'Contact ID is required',
    });
  }

  try {

    const fetch = (...args) =>
      import('node-fetch').then(
        ({ default: fetch }) => fetch(...args)
      );


    console.log(
      '========== GET MY TICKETS =========='
    );

    console.log(
      'Contact ID:',
      contactId
    );


    // =====================================================
    // STEP 1
    // CONTACT -> ALL ASSOCIATED TICKET IDS
    // WITH PAGINATION
    // =====================================================

    let allTicketIds = [];

    let after = null;

    let pageNumber = 1;


    do {

      let associationUrl =
        `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/tickets?limit=100`;


      if (after) {

        associationUrl +=
          `&after=${encodeURIComponent(after)}`;

      }


      console.log(
        `Fetching My Tickets association page ${pageNumber}`
      );


      const associationResponse =
        await fetch(
          associationUrl,
          {
            method: 'GET',
            headers: {
              Authorization:
                `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type':
                'application/json',
            },
          }
        );

      const associationText =
        await associationResponse.text();
      let associationData = {};
      try {
        associationData =
          associationText
            ? JSON.parse(
                associationText
              )
            : {};
      } catch (error) {
        console.error(
          'My Tickets association JSON error:',
          associationText
        );

        return res.status(500).json({
          message:
            'Invalid HubSpot association response',
        });
      }

      console.log(
        `My Tickets page ${pageNumber} HTTP status:`,
        associationResponse.status
      );

      console.log(
        `My Tickets page ${pageNumber} count:`,
        associationData.results?.length || 0
      );

      if (!associationResponse.ok) {
        console.error(
          'My Tickets association error:',
          associationData
        );

        return res
          .status(
            associationResponse.status
          )
          .json({
            message:
              'Failed to fetch contact ticket associations',
            detail:
              associationData,
          });
      }

      const pageIds =
        (
          associationData.results ||
          []
        )
          .map(
            item =>
              String(item.id)
          )
          .filter(Boolean);
      allTicketIds.push(
        ...pageIds
      );

      console.log(
        'My Ticket IDs collected:',
        allTicketIds.length
      );
      after =
        associationData
          ?.paging
          ?.next
          ?.after ||
        null;
      console.log(
        'My Tickets next after:',
        after
      );

      pageNumber += 1;
    } while (after);

    // =====================================================
    // REMOVE DUPLICATE TICKET IDS
    // =====================================================

    const ticketIds = [
      ...new Set(
        allTicketIds
      ),
    ];
    console.log(
      '===================================='
    );
    console.log(
      'FINAL UNIQUE MY TICKET IDS:',
      ticketIds.length
    );
    console.log(
      '===================================='
    );

    if (!ticketIds.length) {
      return res.status(200).json({
        message:
          'No tickets found',
        total:
          0,
        tickets:
          [],
      });
    }

    // =====================================================
    // STEP 2
    // FETCH TICKET DETAILS USING BATCH API
    //
    // Example:
    // 250 tickets
    //
    // Batch 1 = 100
    // Batch 2 = 100
    // Batch 3 = 50
    //
    // Instead of 250 individual requests.
    // =====================================================

    const BATCH_SIZE =
      100;
    const ticketChunks =
      [];
    for (
      let i = 0;
      i < ticketIds.length;
      i += BATCH_SIZE
    ) {
      ticketChunks.push(
        ticketIds.slice(
          i,
          i + BATCH_SIZE
        )
      );
    }

    console.log(
      'Total My Ticket batches:',
      ticketChunks.length
    );
    let allTickets =
      [];

    for (
      let batchIndex = 0;
      batchIndex < ticketChunks.length;
      batchIndex++
    ) {
      const chunk =
        ticketChunks[
          batchIndex
        ];

      console.log(
        `Fetching My Ticket batch ${batchIndex + 1}/${ticketChunks.length}`
      );

      console.log(
        'My Ticket batch size:',
        chunk.length
      );


      const batchResponse =
        await fetch(

          'https://api.hubapi.com/crm/v3/objects/tickets/batch/read',

          {
            method:
              'POST',
            headers: {
              Authorization:
                `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                properties: [
                  'subject',
                  'createdate',
                  'hubspot_owner_id',
                  'hs_pipeline_stage',
                  'customer_portal',
                  'dealer_unread_count',
                ],
                inputs:
                  chunk.map(
                    ticketId => ({
                      id:
                        String(
                          ticketId
                        ),
                    })
                  ),
              }),
          }
        );
      const batchText =
        await batchResponse.text();
      let batchData = {};
      try {
        batchData =
          batchText
            ? JSON.parse(
                batchText
              )
            : {};
      } catch (error) {
        console.error(
          `My Ticket batch ${batchIndex + 1} JSON error:`,
          batchText
        );
        return res.status(500).json({
          message:
            `Invalid HubSpot response for My Ticket batch ${batchIndex + 1}`,
        });
      }
      console.log(
        `My Ticket batch ${batchIndex + 1} HTTP status:`,
        batchResponse.status
      );
      console.log(
        `My Ticket batch ${batchIndex + 1} returned:`,
        batchData.results?.length || 0
      );
      if (!batchResponse.ok) {
        console.error(
          `My Ticket batch ${batchIndex + 1} failed:`,
          batchData
        );
        return res
          .status(
            batchResponse.status
          )
          .json({
            message:
              `HubSpot My Ticket batch ${batchIndex + 1} failed`,
            detail:
              batchData,
          });
      }

      allTickets.push(
        ...(
          batchData.results ||
          []
        )
      );

      console.log(
        'Total My Ticket details collected:',
        allTickets.length
      );


      /*
       * Small delay between batches.
       */

      if (
        batchIndex <
        ticketChunks.length - 1
      ) {
        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              150
            )
        );
      }
    }



    // =====================================================
    // STEP 3
    // FORMAT TICKETS
    // =====================================================

    const formattedTickets =
      allTickets
        .filter(
          ticket =>
            ticket &&
            ticket.properties
        )
        .map(
          ticket => ({
            ticketId:
              String(
                ticket.id
              ),
            subject:
              ticket.properties
                ?.subject ||
              '',
            createdDate:
              ticket.properties
                ?.createdate ||
              '',
            ownerId:
              ticket.properties
                ?.hubspot_owner_id ||
              '',
            status:
              ticket.properties
                ?.hs_pipeline_stage ||
              '',
            customer_portal:
              ticket.properties
                ?.customer_portal ??
              '',
            dealer_unread_count:
              Number(
                ticket.properties
                  ?.dealer_unread_count ||
                0
              ),
          })
        );


    // =====================================================
    // FINAL DEBUG
    // =====================================================

    console.log(
      '===================================='
    );
    console.log(
      'MY ASSOCIATED TICKET IDS:',
      ticketIds.length
    );
    console.log(
      'MY TICKET DETAILS RETURNED:',
      allTickets.length
    );
    console.log(
      'MY FORMATTED TICKETS:',
      formattedTickets.length
    );
    console.log(
      '===================================='
    );


    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      message:
        'My tickets fetched successfully',
      contactId:
        String(contactId),
      associatedTicketCount:
        ticketIds.length,
      total:
        formattedTickets.length,
      tickets:
        formattedTickets,
    });
  } catch (error) {
    console.error(
      'GET MY TICKETS ERROR:',
      {
        message:
          error?.message,
        stack:
          error?.stack,
      }
    );

    return res.status(500).json({
      message:
        'Internal server error',
      error:
        error?.message ||
        'Unknown error',
    });
  }
});


app.post(
  '/get-organization-tickets',
  async (req, res) => {
    const { contactId } = req.body;
    if (!contactId) {
      return res.status(400).json({
        message: 'Contact ID is required',
      });
    }
    try {
      const fetch = (...args) =>
        import('node-fetch').then(
          ({ default: fetch }) => fetch(...args)
        );
      console.log(
        '========== GET ORGANIZATION TICKETS =========='
      );
      console.log(
        'Contact ID:',
        contactId
      );

      // =====================================================
      // STEP 1
      // CONTACT -> COMPANY
      // =====================================================

      const contactResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?associations=companies`,
        {
          method: 'GET',
          headers: {
            Authorization:
              `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type':
              'application/json',
          },
        }
      );

      const contactData =
        await contactResponse.json();
      if (!contactResponse.ok) {
        console.error(
          'Contact company fetch failed:',
          contactData
        );
        return res
          .status(contactResponse.status)
          .json({
            message:
              'Failed to fetch contact company',
          });
      }

      const companies =
        contactData
          ?.associations
          ?.companies
          ?.results || [];
      console.log(
        'Associated Companies:',
        companies
      );

      if (!companies.length) {
        return res.status(200).json({
          message:
            'No organization associated with contact',
          tickets: [],
          total: 0,
        });
      }

    const companyId =
        String(companies[0].id);

      console.log(
        'Organization Company ID:',
        companyId
      );


      // =====================================================
      // STEP 2
      // COMPANY -> ALL TICKET IDS
      // PAGINATION
      // =====================================================

      let allTicketIds = [];
      let after = null;
      let pageNumber = 1;
      do {
        let url =
          `https://api.hubapi.com/crm/v3/objects/companies/${companyId}/associations/tickets?limit=100`;
        if (after) {
          url +=
            `&after=${encodeURIComponent(after)}`;
        }
        console.log(
          `Fetching association page ${pageNumber}`
        );

        const associationResponse =
          await fetch(
            url,
            {
              method: 'GET',
              headers: {
                Authorization:
                  `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type':
                  'application/json',
              },
            }
          );

        const associationText =
          await associationResponse.text();
        let associationData = {};
        try {
          associationData =
            associationText
              ? JSON.parse(
                  associationText
                )
              : {};
        } catch (error) {
          console.error(
            'Association JSON error:',
            associationText
          );
          return res.status(500).json({
            message:
              'Invalid HubSpot association response',
          });
        }
        console.log(
          `Association page ${pageNumber} status:`,
          associationResponse.status
        );
        console.log(
          `Association page ${pageNumber} count:`,
          associationData.results?.length || 0
        );
        if (!associationResponse.ok) {
          console.error(
            'Company association error:',
            associationData
          );
          return res
            .status(
              associationResponse.status
            )
            .json({
              message:
                'Failed to fetch organization associations',
              detail:
                associationData,
            });
        }

        const pageIds =
          (
            associationData.results ||
            []
          )
            .map(
              item =>
                String(item.id)
            )
            .filter(Boolean);
        allTicketIds.push(
          ...pageIds
        );
        console.log(
          'Ticket IDs collected:',
          allTicketIds.length
        );
        after =
          associationData
            ?.paging
            ?.next
            ?.after ||
          null;
        pageNumber += 1;
      } while (after);

      // =====================================================
      // REMOVE DUPLICATE IDs
      // =====================================================

      const ticketIds = [
        ...new Set(
          allTicketIds
        ),
      ];
      console.log(
        '===================================='
      );
      console.log(
        'FINAL UNIQUE ORGANIZATION TICKET IDS:',
        ticketIds.length
      );
      console.log(
        '===================================='
      );

      if (!ticketIds.length) {
        return res.status(200).json({
          message:
            'No organization tickets found',
          total:
            0,
          tickets:
            [],
        });
      }

      // =====================================================
      // STEP 3
      // BATCH READ TICKETS
      // =====================================================

      const BATCH_SIZE =
        100;
      const ticketChunks =
        [];
      for (
        let i = 0;
        i < ticketIds.length;
        i += BATCH_SIZE
      ) {
        ticketChunks.push(
          ticketIds.slice(
            i,
            i + BATCH_SIZE
          )
        );
      }
      console.log(
        'Total ticket batches:',
        ticketChunks.length
      );
      let allTickets =
        [];
    
      for (
        let batchIndex = 0;
        batchIndex <
          ticketChunks.length;
        batchIndex++
      ) {
        const chunk =
          ticketChunks[
            batchIndex
          ];
        console.log(
          `Fetching ticket batch ${batchIndex + 1}/${ticketChunks.length}`
        );
        console.log(
          'Batch size:',
          chunk.length
        );
        const batchResponse =
          await fetch(
            'https://api.hubapi.com/crm/v3/objects/tickets/batch/read',
            {
              method:
                'POST',
              headers: {
                Authorization:
                  `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify({
                  properties: [
                    'subject',
                    'createdate',
                    'hubspot_owner_id',
                    'hs_pipeline_stage',
                    'customer_portal',
                    'dealer_unread_count',
                  ],
                  inputs:
                    chunk.map(
                      ticketId => ({
                        id:
                          String(
                            ticketId
                          ),
                      })
                    ),
                }),
            }
          );

        const batchText =
          await batchResponse.text();
        let batchData = {};
        try {
          batchData =
            batchText
              ? JSON.parse(
                  batchText
                )
              : {};
        } catch (error) {
          console.error(
            `Batch ${batchIndex + 1} JSON error:`,
            batchText
          );
          return res.status(500).json({
            message:
              `Invalid response from HubSpot batch ${batchIndex + 1}`,
          });
        }
        console.log(
          `Batch ${batchIndex + 1} HTTP status:`,
          batchResponse.status
        );
        console.log(
          `Batch ${batchIndex + 1} tickets returned:`,
          batchData.results?.length ||
            0
        );
        if (!batchResponse.ok) {
          console.error(
            `Ticket batch ${batchIndex + 1} failed:`,
            batchData
          );
          return res
            .status(
              batchResponse.status
            )
            .json({
              message:
                `HubSpot ticket batch ${batchIndex + 1} failed`,
              detail:
                batchData,
            });
        }

        allTickets.push(
          ...(
            batchData.results ||
            []
          )
        );
        console.log(
          'Total ticket details collected:',
          allTickets.length
        );

        if (
          batchIndex <
          ticketChunks.length - 1
        ) {
          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                150
              )
          );
        }
      }



      // =====================================================
      // STEP 4
      // FORMAT TICKETS
      // =====================================================

      const formattedTickets =
        allTickets

          .filter(
            ticket =>
              ticket &&
              ticket.properties
          )

          .map(
            ticket => ({

              ticketId:
                String(
                  ticket.id
                ),

              subject:
                ticket.properties
                  ?.subject ||
                '',

              createdDate:
                ticket.properties
                  ?.createdate ||
                '',

              ownerId:
                ticket.properties
                  ?.hubspot_owner_id ||
                '',

              status:
                ticket.properties
                  ?.hs_pipeline_stage ||
                '',

              customer_portal:
                ticket.properties
                  ?.customer_portal ??
                '',

              dealer_unread_count:
                Number(
                  ticket.properties
                    ?.dealer_unread_count ||
                  0
                ),

            })
          );



      console.log(
        '===================================='
      );

      console.log(
        'ASSOCIATED TICKET IDS:',
        ticketIds.length
      );

      console.log(
        'TICKET DETAILS RETURNED:',
        allTickets.length
      );

      console.log(
        'FORMATTED TICKETS:',
        formattedTickets.length
      );

      console.log(
        '===================================='
      );



      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({

        message:
          'Organization tickets fetched successfully',

        organizationId:
          companyId,

        associatedTicketCount:
          ticketIds.length,

        total:
          formattedTickets.length,

        tickets:
          formattedTickets,

      });


    } catch (error) {

      console.error(
        'GET ORGANIZATION TICKETS ERROR:',
        {
          message:
            error?.message,

          stack:
            error?.stack,
        }
      );


      return res.status(500).json({

        message:
          'Internal server error',

        error:
          error?.message ||
          'Unknown error',

      });

    }

  }
);



app.post('/get_owner_ticket', async (req, res) => {

  const { ownerId } = req.body;

  if (!ownerId) {
    return res.status(400).json({
      message: 'Owner ID is required',
    });
  }

  try {

    const fetch = (...args) =>
      import('node-fetch').then(
        ({ default: fetch }) => fetch(...args)
      );


    console.log(
      '========== GET OWNER TICKETS =========='
    );

    console.log(
      'Owner ID:',
      ownerId
    );


    let allTickets = [];

    let after = null;

    let pageNumber = 1;


    // =====================================================
    // FETCH ALL OWNER TICKETS WITH PAGINATION
    // =====================================================

    do {

      console.log(
        `Fetching Owner Ticket page ${pageNumber}`
      );


      const response = await fetch(
        'https://api.hubapi.com/crm/v3/objects/tickets/search',
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${HUBSPOT_API_KEY}`,

            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({

            filterGroups: [
              {
                filters: [
                  {
                    propertyName:
                      'hubspot_owner_id',

                    operator:
                      'EQ',

                    value:
                      String(ownerId),
                  },
                ],
              },
            ],


            properties: [
              'subject',
              'content',
              'hs_pipeline',
              'hs_pipeline_stage',
              'hubspot_owner_id',
              'createdate',
              'customer_portal',
              'dealer_unread_count',
            ],


            limit:
              100,


            ...(after
              ? {
                  after:
                    after,
                }
              : {}),


            /*
             * Newest tickets first.
             */
            sorts: [
              {
                propertyName:
                  'createdate',

                direction:
                  'DESCENDING',
              },
            ],

          }),
        }
      );


      const responseText =
        await response.text();


      let data = {};


      try {

        data =
          responseText
            ? JSON.parse(
                responseText
              )
            : {};

      } catch (error) {

        console.error(
          `Owner Ticket page ${pageNumber} JSON error:`,
          responseText
        );


        return res.status(500).json({

          message:
            `Invalid response from HubSpot Owner Ticket page ${pageNumber}`,

        });

      }


      console.log(
        `Owner Ticket page ${pageNumber} HTTP status:`,
        response.status
      );


      console.log(
        `Owner Ticket page ${pageNumber} count:`,
        data.results?.length || 0
      );


      if (!response.ok) {

        console.error(
          `Owner Ticket page ${pageNumber} failed:`,
          data
        );


        return res
          .status(
            response.status
          )
          .json({

            message:
              `Failed to fetch Owner Ticket page ${pageNumber}`,

            detail:
              data,

          });

      }


      allTickets.push(
        ...(
          data.results ||
          []
        )
      );


      console.log(
        'Total Owner Tickets collected:',
        allTickets.length
      );


      after =
        data
          ?.paging
          ?.next
          ?.after ||
        null;


      console.log(
        'Next after:',
        after
      );


      pageNumber += 1;


    } while (after);



    // =====================================================
    // REMOVE DUPLICATES
    // =====================================================

    const uniqueTickets =
      Array.from(
        new Map(
          allTickets.map(
            ticket => [
              String(ticket.id),
              ticket,
            ]
          )
        ).values()
      );


    console.log(
      'Unique Owner Tickets:',
      uniqueTickets.length
    );



    // =====================================================
    // FORMAT RESPONSE
    // =====================================================

    const tickets =
      uniqueTickets.map(
        item => ({

          ticketId:
            String(item.id),

          subject:
            item.properties
              ?.subject ||
            '',

          createdDate:
            item.properties
              ?.createdate ||
            '',

          ownerId:
            item.properties
              ?.hubspot_owner_id ||
            '',

          status:
            item.properties
              ?.hs_pipeline_stage ||
            '',

          content:
            item.properties
              ?.content ||
            '',

          customer_portal:
            item.properties
              ?.customer_portal ??
            '',

          dealer_unread_count:
            Number(
              item.properties
                ?.dealer_unread_count ||
              0
            ),

        })
      );


    console.log(
      '===================================='
    );

    console.log(
      'FINAL OWNER TICKET COUNT:',
      tickets.length
    );

    console.log(
      '===================================='
    );


    return res.status(200).json({

      message:
        'All owner tickets fetched successfully',

      ownerId:
        String(ownerId),

      total:
        tickets.length,

      tickets:
        tickets,

    });


  } catch (error) {

    console.error(
      'Owner Ticket Fetch Error:',
      {
        message:
          error?.message,

        stack:
          error?.stack,
      }
    );


    return res.status(500).json({

      message:
        'Internal server error',

      error:
        error?.message ||
        'Unknown error',

    });

  }

});

app.post('/get-owner-id', async (req, res) => {
  const { email } = req.body;
  console.log('=== get-owner-id hit ===');
  console.log('Email received:', email);

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    const response = await axios.get(
      'https://api.hubapi.com/crm/v3/owners?archived=false',
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
      }
    );

    const owners = response.data.results || [];
    console.log('Total owners found:', owners.length);
    console.log('All owner emails:', owners.map(o => o.email));

    const matchedOwner = owners.find(
      (owner) => owner.email?.toLowerCase() === email?.toLowerCase()
    );

    console.log('Matched owner:', matchedOwner || 'NOT FOUND');

    if (!matchedOwner) {
      return res.status(200).json({ ownerId: null }); 
    }

    return res.status(200).json({ ownerId: matchedOwner.userId, OwnerUserID: matchedOwner.id });

  } catch (err) {
    console.error('Get owner error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to get owner' });
  }
});

//Get Conversation Details
app.post('/get_ticket_conversation', async (req, res) => {
  const { ticketId } = req.body;

  if (!ticketId) {
    return res.status(400).json({ message: 'Ticket ID is required' });
  }

  try {
    const fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));

    
    const ticketRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/tickets/${ticketId}?properties=hs_conversations_originating_thread_id`,
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
      }
    );

    const ticketData = await ticketRes.json();
    const threadId =
      ticketData?.properties?.hs_conversations_originating_thread_id;

      console.log('threadId--- ' , threadId);

    if (!threadId) {
      return res.status(200).json({
        messages: [],
      });
    }

    
    const msgRes = await fetch(
      `https://api.hubapi.com/conversations/v3/conversations/threads/${threadId}/messages`,
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
      }
    );

    const msgData = await msgRes.json();

    
    const formattedMessages = msgData.results
      .filter(m => m.type === 'MESSAGE')
      .map(m => {
        const sender = m.senders?.[0] || {};
        const email = sender?.deliveryIdentifier?.value || '';
        const name = sender?.name || email;

        return {
          id: m.id,
          direction: m.direction, 
          senderName: name,
          text: m.text || '',
          richText: m.richText || '',
          createdAt: m.createdAt,
          subject : m.subject,
          attachments: m.attachments,
          conversationsThreadId:
    String(threadId),
        };
      });

    return res.status(200).json({
      messages: formattedMessages,
    });

  } catch (err) {
    console.error('Conversation error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


const uploadedFilesForViewTicket = [];
app.post('/upload-to-hubspot-view', hubspotUpload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.json({ success: true, files: [] });
    }
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(file.path));
      formData.append('fileName', file.originalname);
      formData.append('folderId', '204201997753'); 
      formData.append(
        'options',
        JSON.stringify({ access: 'PUBLIC_INDEXABLE' })
      );
      const response = await axios.post(
        'https://api.hubapi.com/files/v3/files',
        formData,
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
            ...formData.getHeaders(),
          },
        }
      );
      uploadedFilesForViewTicket.push({
        id: response.data.id,
        url: response.data.url,
      });
      fs.unlinkSync(file.path);
    }
    res.json({
      success: true,
      files: uploadedFilesForViewTicket,
    });
    console.log('uploadedFilesForViewTicket--- ', uploadedFilesForViewTicket);
    uploadedFilesForViewTicket.length = 0; 
  } catch (err) {
    console.log(err.response?.data || err);
    res.status(500).json({ error: 'File upload failed' });
  }
});


app.post('/send-hubspot-message', async (req, res) => {
  const { threadId, text, recipientEmail, attachmentIds, channelAccountId, channelId, senderActorId, subject } = req.body;

  console.log('=== send-hubspot-message hit ===');
  console.log('threadId:', threadId);
  console.log('text:', text);
  console.log('recipientEmail:', recipientEmail);
  console.log('attachmentIds:', attachmentIds);
  console.log('channelAccountId:', channelAccountId);
  console.log('channelId:', channelId);
  console.log('senderActorId received:', senderActorId);
  console.log('subject:', subject);

  try {
    
    const body = {
      type: 'MESSAGE',
      text: text,
      subject: subject,
      senderActorId: senderActorId,
      channelId: '1002',
      channelAccountId: '597383280',
      recipients: [
        {
          recipientField: 'TO',
          deliveryIdentifiers: [
            { type: 'HS_EMAIL_ADDRESS', value: recipientEmail },
          ],
        },
      ],
    };

    
    if (attachmentIds && attachmentIds.length > 0) {
      body.attachments = attachmentIds.map((id) => ({ fileId: String(id) }));
    }

    console.log('Final body HubSpot ko ja raha hai:', JSON.stringify(body, null, 2));

    const response = await axios.post(
      `https://api.hubapi.com/conversations/v3/conversations/threads/${threadId}/messages`,
      body,
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('HubSpot response:', response.data);
    return res.status(200).json({ success: true, data: response.data });

  } catch (err) {
    console.error('Send message error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Message send failed', detail: err.response?.data });
  }
});



app.get('/customer-news', async (req, res) => {  
  try {
    const response = await fetch(
      'https://api.hubapi.com/cms/v3/blogs/posts?contentGroupId__eq=218892120384',
      {
        method: 'GET',
        headers: { 
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.log('Customer News Error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
});



app.listen(PORT,'0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));


app.listen(PORT, () => console.log(`Server running on ${PORT}`));
// app.listen(PORT,'0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));