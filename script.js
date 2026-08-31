/* ==================================================
   CHATTERBOX
   Main application script
================================================== */


/* ==================================================
   INIT
================================================== */

const myName = localStorage.getItem("username");

if (!myName) {
  window.location.href = "auth.html";
}

const db = firebase.database();


/* ==================================================
   STATE
================================================== */

let currentChatType = "global";
let currentChatFriend = null;
let currentChatID = null;

let privateMessagesRef = null;

let lastSeen = {};


/* ==================================================
   DESKTOP NOTIFICATIONS
================================================== */

if ("Notification" in window) {
  Notification.requestPermission();
}


function sendDesktopNotification(title, body) {

  if (
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification(title, {
      body: body
    });
  }

}


/* ==================================================
   POPUP NOTIFICATIONS
================================================== */

function makePopup(message, background) {

  const box = document.createElement("div");

  Object.assign(box.style, {

    position: "fixed",

    top: "20px",
    right: "20px",

    background: background,

    color: "white",

    padding: "12px 18px",

    borderRadius: "8px",

    fontSize: "18px",

    fontWeight: "bold",

    zIndex: "99999",

    boxShadow:
      "0 5px 20px rgba(0,0,0,0.25)"

  });


  box.textContent = message;


  document.body.appendChild(box);


  setTimeout(() => {

    box.remove();

  }, 2200);

}


function showError(message) {

  makePopup(
    message,
    "#e53935"
  );

}


function showSuccess(message) {

  makePopup(
    message,
    "#4da6ff"
  );

}


/* ==================================================
   CHAT ID
================================================== */

function getChatID(a, b) {

  return [
    a,
    b
  ]
    .sort()
    .join("_");

}


/* ==================================================
   UPDATE CURRENT CHAT LABEL
================================================== */

function updateChatLabel(name) {

  document.getElementById(
    "currentChatName"
  ).textContent = name;

}


/* ==================================================
   CLEAR ACTIVE FRIEND
================================================== */

function clearActiveFriend() {

  document
    .querySelectorAll(".friendItem")
    .forEach(item => {

      item.classList.remove(
        "activeFriend"
      );

    });

}


/* ==================================================
   GLOBAL CHAT
================================================== */

function switchToGlobalChat(
  showPopup = true
) {

  currentChatType = "global";

  currentChatFriend = null;

  currentChatID = null;


  clearActiveFriend();


  document
    .getElementById("globalChatBtn")
    .classList.add("activeFriend");


  updateChatLabel(
    "Global Chat"
  );


  document.getElementById(
    "messages"
  ).innerHTML = "";


  if (privateMessagesRef) {

    privateMessagesRef.off();

    privateMessagesRef = null;

  }


  db.ref("messages").off();


  db.ref("messages").on(
    "child_added",
    snapshot => {

      const message =
        snapshot.val();


      renderMessage(
        message.user,
        message.text
      );

    }
  );


  if (showPopup) {

    showSuccess(
      "Switched to Global Chat"
    );

  }

}


/* ==================================================
   PRIVATE CHAT
================================================== */

function switchToPrivateChat(
  friend
) {

  currentChatType = "private";

  currentChatFriend = friend;

  currentChatID =
    getChatID(
      myName,
      friend
    );


  /*
    Remove unread indicator
  */

  db.ref(
    `unreadChats/${myName}/${currentChatID}`
  ).remove();


  /*
    Remove global active state
  */

  document
    .getElementById("globalChatBtn")
    .classList.remove(
      "activeFriend"
    );


  /*
    Highlight selected friend
  */

  clearActiveFriend();


  const friendElement =
    document.getElementById(
      `friendItem_${CSS.escape(friend)}`
    );


  if (friendElement) {

    friendElement.classList.add(
      "activeFriend"
    );

  }


  /*
    Keep ChatterBox as the main title.
    Only change the smaller subtitle.
  */

  updateChatLabel(
    "Chat with " + friend
  );


  /*
    Clear messages currently shown
  */

  document.getElementById(
    "messages"
  ).innerHTML = "";


  /*
    Stop global listener
  */

  db.ref("messages").off();


  /*
    Stop previous private listener
  */

  if (privateMessagesRef) {

    privateMessagesRef.off();

  }


  /*
    IMPORTANT:
    The chat itself is NOT created here.

    It is only created when someone
    sends a message.
  */

  privateMessagesRef =
    db.ref(
      `privateChats/${currentChatID}/messages`
    );


  privateMessagesRef.on(
    "child_added",
    snapshot => {

      const message =
        snapshot.val();


      renderMessage(
        message.user,
        message.text
      );

    }
  );


  /*
    Refresh friend list so the unread
    dot disappears.
  */

  loadFriends(myName);

}


/* ==================================================
   RENDER MESSAGE
================================================== */

function renderMessage(
  user,
  text
) {

  const bubble =
    document.createElement("div");


  bubble.classList.add(
    "bubble"
  );


  if (user === myName) {

    bubble.classList.add(
      "me"
    );

  } else {

    bubble.classList.add(
      "other"
    );

  }


  /*
    Username
  */

  const username =
    document.createElement("div");


  username.className =
    "messageUsername";


  username.textContent =
    user;


  /*
    Message text
  */

  const messageText =
    document.createElement("div");


  messageText.textContent =
    text;


  bubble.appendChild(
    username
  );


  bubble.appendChild(
    messageText
  );


  /*
    Add to screen
  */

  const messages =
    document.getElementById(
      "messages"
    );


  messages.appendChild(
    bubble
  );


  /*
    Scroll to newest message
  */

  messages.scrollTop =
    messages.scrollHeight;

}


/* ==================================================
   SEND MESSAGE
================================================== */

function sendMessage() {

  const input =
    document.getElementById(
      "input"
    );


  const text =
    input.value.trim();


  if (!text) {

    return;

  }


  const message = {

    text: text,

    user: myName,

    time: Date.now()

  };


  /* ------------------------------------------
     GLOBAL CHAT
  ------------------------------------------ */

  if (
    currentChatType ===
    "global"
  ) {

    db.ref(
      "messages"
    ).push(message);

  }


  /* ------------------------------------------
     PRIVATE CHAT
  ------------------------------------------ */

  else {

    /*
      Create the chat ONLY when
      the first message is sent.
    */

    db.ref(
      `privateChats/${currentChatID}`
    ).update({

      createdAt:
        firebase.database.ServerValue.TIMESTAMP

    });


    /*
      Add message
    */

    db.ref(
      `privateChats/${currentChatID}/messages`
    ).push(message);


    /*
      Mark unread for friend
    */

    if (currentChatFriend) {

      db.ref(
        `unreadChats/${currentChatFriend}/${currentChatID}`
      ).set(true);

    }

  }


  /*
    Clear input
  */

  input.value = "";

  input.focus();

}


/* ==================================================
   ADD FRIEND BUTTON
================================================== */

function handleAddFriend() {

  const input =
    document.getElementById(
      "friendSearchInput"
    );


  const friendUsername =
    input.value.trim();


  addFriend(
    myName,
    friendUsername
  );


  input.value = "";

}


/* ==================================================
   SEARCH USER
================================================== */

async function searchUser(
  username
) {

  const snapshot =
    await db.ref(
      "users/" + username
    ).get();


  return snapshot.exists();

}


/* ==================================================
   ADD FRIEND
================================================== */

async function addFriend(
  myUsername,
  friendUsername
) {

  if (!friendUsername) {

    showError(
      "Enter a username."
    );

    return;

  }


  if (
    myUsername ===
    friendUsername
  ) {

    showError(
      "You can't add yourself."
    );

    return;

  }


  try {

    const exists =
      await searchUser(
        friendUsername
      );


    if (!exists) {

      showError(
        "User not found."
      );

      return;

    }


    /*
      Add friend to my account
    */

    await db.ref(
      `users/${myUsername}/friends/${friendUsername}`
    ).set(true);


    /*
      Add me to their account
    */

    await db.ref(
      `users/${friendUsername}/friends/${myUsername}`
    ).set(true);


    loadFriends(myName);


    showSuccess(
      friendUsername +
      " added as a friend."
    );

  }

  catch (error) {

    console.error(error);

    showError(
      "Something went wrong."
    );

  }

}


/* ==================================================
   DELETE FRIEND
================================================== */

function deleteFriend(
  friend
) {

  const chatID =
    getChatID(
      myName,
      friend
    );


  /*
    Remove friendship
  */

  db.ref(
    `users/${myName}/friends/${friend}`
  ).remove();


  db.ref(
    `users/${friend}/friends/${myName}`
  ).remove();


  /*
    Remove private conversation
  */

  db.ref(
    `privateChats/${chatID}`
  ).remove();


  /*
    Remove unread indicators
  */

  db.ref(
    `unreadChats/${myName}/${chatID}`
  ).remove();


  db.ref(
    `unreadChats/${friend}/${chatID}`
  ).remove();


  /*
    If currently talking to them,
    return to Global Chat.
  */

  if (
    currentChatFriend ===
    friend
  ) {

    switchToGlobalChat(
      false
    );

  }


  closePopup();

  loadFriends(myName);


  showSuccess(
    friend +
    " removed from friends."
  );

}


/* ==================================================
   FRIEND POPUP
================================================== */

function openPopup(
  friend,
  element
) {

  const popup =
    document.getElementById(
      "popupBox"
    );


  const name =
    document.getElementById(
      "popupFriendName"
    );


  name.textContent =
    friend;


  const rect =
    element.getBoundingClientRect();


  /*
    Keep popup inside screen
  */

  let left =
    rect.right + 10;


  let top =
    rect.top;


  if (
    left + 200 >
    window.innerWidth
  ) {

    left =
      rect.left - 210;

  }


  if (
    top + 180 >
    window.innerHeight
  ) {

    top =
      window.innerHeight - 190;

  }


  popup.style.left =
    left + "px";


  popup.style.top =
    top + "px";


  popup.style.display =
    "flex";


  /*
    Open chat
  */

  document.getElementById(
    "popupOpenChatBtn"
  ).onclick = () => {

    closePopup();

    switchToPrivateChat(
      friend
    );

  };


  /*
    Delete friend
  */

  document.getElementById(
    "popupDeleteFriendBtn"
  ).onclick = () => {

    deleteFriend(
      friend
    );

  };

}


/* ==================================================
   CLOSE POPUP
================================================== */

function closePopup() {

  document.getElementById(
    "popupBox"
  ).style.display =
    "none";

}


/* ==================================================
   CLOSE POPUP WHEN CLICKING OUTSIDE
================================================== */

document.addEventListener(
  "click",
  event => {

    const popup =
      document.getElementById(
        "popupBox"
      );


    if (
      popup.style.display ===
      "flex" &&
      !popup.contains(event.target) &&
      !event.target.classList.contains("friendItem")
    ) {

      closePopup();

    }

  }
);


/* ==================================================
   LOAD FRIENDS
================================================== */

function loadFriends(
  username
) {

  const friendsRef =
    db.ref(
      `users/${username}/friends`
    );


  friendsRef.off();


  friendsRef.on(
    "value",
    friendsSnapshot => {

      const friends =
        friendsSnapshot.val() || {};


      const list =
        document.getElementById(
          "friendsList"
        );


      list.innerHTML = "";


      /*
        Get unread messages
      */

      db.ref(
        `unreadChats/${username}`
      ).once(
        "value"
      )
      .then(
        unreadSnapshot => {

          const unread =
            unreadSnapshot.val() || {};


          Object.keys(friends)
            .sort((a, b) =>
              a.localeCompare(b)
            )
            .forEach(
              friend => {

                const item =
                  document.createElement(
                    "div"
                  );


                item.className =
                  "friendItem";


                /*
                  IDs can contain special
                  characters, so don't rely
                  on querySelector for them.
                */

                item.dataset.friend =
                  friend;


                item.id =
                  "friendItem_" +
                  encodeURIComponent(
                    friend
                  );


                /*
                  Friend name
                */

                const name =
                  document.createElement(
                    "span"
                  );


                name.textContent =
                  friend;


                item.appendChild(
                  name
                );


                /*
                  Unread indicator
                */

                const chatID =
                  getChatID(
                    username,
                    friend
                  );


                if (
                  unread[chatID] &&
                  currentChatFriend !==
                  friend
                ) {

                  const dot =
                    document.createElement(
                      "span"
                    );


                  dot.className =
                    "unreadDot";


                  item.appendChild(
                    dot
                  );

                }


                /*
                  Left click:
                  Open chat immediately
                */

                item.onclick =
                  event => {

                    event.stopPropagation();

                    switchToPrivateChat(
                      friend
                    );

                  };


                /*
                  Right click:
                  Friend options
                */

                item.oncontextmenu =
                  event => {

                    event.preventDefault();

                    event.stopPropagation();

                    openPopup(
                      friend,
                      item
                    );

                  };


                list.appendChild(
                  item
                );


                /*
                  Keep currently selected
                  friend highlighted.
                */

                if (
                  currentChatFriend ===
                  friend &&
                  currentChatType ===
                  "private"
                ) {

                  item.classList.add(
                    "activeFriend"
                  );

                }

              }
            );

        }
      );

    }
  );

}


/* ==================================================
   PRIVATE CHAT NOTIFICATIONS
================================================== */

function listenToChat(
  chatID
) {

  if (
    !lastSeen[chatID]
  ) {

    lastSeen[chatID] = 0;

  }


  db.ref(
    `privateChats/${chatID}/messages`
  ).on(
    "child_added",
    snapshot => {

      const message =
        snapshot.val();


      /*
        Ignore messages that existed
        before this listener started.
      */

      if (
        message.time <=
        lastSeen[chatID]
      ) {

        return;

      }


      /*
        Don't notify yourself.
      */

      if (
        message.user !==
        myName
      ) {

        /*
          If we're not currently
          looking at this conversation,
          mark it unread.
        */

        if (
          currentChatID !==
          chatID
        ) {

          db.ref(
            `unreadChats/${myName}/${chatID}`
          ).set(true);


          loadFriends(
            myName
          );


          sendDesktopNotification(
            "ChatterBox",
            `New message from ${message.user}: ${message.text}`
          );

        }


        lastSeen[chatID] =
          message.time;

      }

    }
  );

}


/* ==================================================
   ATTACH PRIVATE CHAT LISTENERS
================================================== */

function attachMessageListeners() {

  /*
    Existing conversations
  */

  db.ref(
    "privateChats"
  )
    .once("value")
    .then(
      snapshot => {

        const chats =
          snapshot.val() || {};


        Object.keys(chats)
          .forEach(
            chatID => {

              if (
                chatID
                  .toLowerCase()
                  .includes(
                    myName.toLowerCase()
                  )
              ) {

                listenToChat(
                  chatID
                );

              }

            }
          );

      }
    );


  /*
    Newly created conversations
  */

  db.ref(
    "privateChats"
  ).on(
    "child_added",
    snapshot => {

      const chatID =
        snapshot.key;


      if (
        chatID
          .toLowerCase()
          .includes(
            myName.toLowerCase()
          )
      ) {

        listenToChat(
          chatID
        );

      }

    }
  );

}


/* ==================================================
   AUTO DELETE MESSAGES AFTER 1 HOUR
================================================== */

function autoDeleteMessages() {

  const oneHour =
    60 * 60 * 1000;


  const cutoff =
    Date.now() -
    oneHour;


  /*
    PRIVATE CHATS
  */

  db.ref(
    "privateChats"
  )
    .once("value")
    .then(
      snapshot => {

        const chats =
          snapshot.val() || {};


        Object.keys(chats)
          .forEach(
            chatID => {

              deleteOldMessagesInChat(
                chatID,
                cutoff
              );

            }
          );

      }
    );


  /*
    GLOBAL CHAT
  */

  db.ref(
    "messages"
  )
    .once("value")
    .then(
      snapshot => {

        const messages =
          snapshot.val() || {};


        Object.keys(messages)
          .forEach(
            messageID => {

              const message =
                messages[messageID];


              if (
                message.time <
                cutoff
              ) {

                db.ref(
                  `messages/${messageID}`
                ).remove();

              }

            }
          );

      }
    );

}


/* ==================================================
   DELETE OLD PRIVATE MESSAGES
================================================== */

function deleteOldMessagesInChat(
  chatID,
  cutoff
) {

  db.ref(
    `privateChats/${chatID}/messages`
  )
    .once("value")
    .then(
      snapshot => {

        const messages =
          snapshot.val() || {};


        Object.keys(messages)
          .forEach(
            messageID => {

              const message =
                messages[messageID];


              if (
                message.time <
                cutoff
              ) {

                db.ref(
                  `privateChats/${chatID}/messages/${messageID}`
                ).remove();

              }

            }
          );

      }
    );

}


/* ==================================================
   AUTO DELETE TIMER
================================================== */

setInterval(
  autoDeleteMessages,
  60 * 1000
);


/* ==================================================
   LOGOUT
================================================== */

function logout() {

  localStorage.removeItem(
    "username"
  );


  showSuccess(
    "Logged out."
  );


  setTimeout(
    () => {

      window.location.href =
        "auth.html";

    },
    500
  );

}


/* ==================================================
   CLEAR CURRENT CHAT
================================================== */

function clearChat() {

  /*
    Global Chat
  */

  if (
    currentChatType ===
    "global"
  ) {

    db.ref(
      "messages"
    ).remove();


    document.getElementById(
      "messages"
    ).innerHTML = "";


    showSuccess(
      "Global Chat cleared."
    );


    return;

  }


  /*
    Private Chat
  */

  if (
    currentChatID
  ) {

    db.ref(
      `privateChats/${currentChatID}/messages`
    ).remove();


    document.getElementById(
      "messages"
    ).innerHTML = "";


    showSuccess(
      "Conversation cleared."
    );

  }

}


/* ==================================================
   ENTER KEY TO SEND
================================================== */

document.getElementById(
  "input"
).addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Enter"
    ) {

      event.preventDefault();

      sendMessage();

    }

  }
);


/* ==================================================
   ENTER KEY IN ADD FRIEND
================================================== */

document.getElementById(
  "friendSearchInput"
).addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Enter"
    ) {

      event.preventDefault();

      handleAddFriend();

    }

  }
);


/* ==================================================
   START APPLICATION
================================================== */

attachMessageListeners();

switchToGlobalChat(false);

loadFriends(myName);

autoDeleteMessages();
