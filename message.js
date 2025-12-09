// ---------- Firebase Config ----------
const firebaseConfig = {
  apiKey: "AIzaSyDUefeJbHKIAs-l3zvFlGaas6VD63vv4kI",
  authDomain: "inspire4ever-c60ad.firebaseapp.com",
  databaseURL: "https://inspire4ever-c60ad-default-rtdb.firebaseio.com",
  projectId: "inspire4ever-c60ad",
  storageBucket: "inspire4ever-c60ad.appspot.com",
  messagingSenderId: "125014633127",
  appId: "1:125014633127:web:d29e4c37628ab637f40982"
};

firebase.initializeApp(firebaseConfig);

// ---------- Elements ----------
const chatListScreen = document.getElementById("chatListScreen");
const chatScreen = document.getElementById("chatScreen");
const chatList = document.getElementById("chatList");
const chatBox = document.getElementById("chatBox");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const chatUserName = document.getElementById("chatUserName");
const backBtn = document.getElementById("backBtn");
const listBackBtn = document.getElementById("listBackBtn");

let currentUserId = null;
let selectedUserId = null;

// ---------- URL से UID ----------
const params = new URLSearchParams(window.location.search);
const targetUid = params.get("uid"); // user.html से आया UID

// ---------- Auth ----------
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    alert("Login first");
    location.href = "profile.html";
    return;
  }

  currentUserId = user.uid;

  // पहले chat list load करो
  loadChatList().then(() => {
    // अगर targetUid है → auto open
    if (targetUid) {
      firebase.database().ref("users/" + targetUid).once("value").then(snap => {
        const userData = snap.val();
        if (!userData) {
          alert("User not found");
          return;
        }
        openChat(targetUid, userData.username);
      });
    }
  });
});

// ---------- Load chat list ----------
async function loadChatList() {
  const chatRef = firebase.database().ref("chats");
  chatRef.off(); // duplicate listener prevent
  chatRef.on("value", async snapshot => {
    chatList.innerHTML = ""; // Clear previous list
    const chats = snapshot.val();
    if (!chats) return;

    const chatIds = Object.keys(chats).filter(id => id.includes(currentUserId));
    const addedUsers = new Set(); // prevent duplicates

    for (const chatId of chatIds) {
      const ids = chatId.split("_");
      const otherUid = ids[0] === currentUserId ? ids[1] : ids[0];

      if (addedUsers.has(otherUid)) continue; // skip duplicate
      addedUsers.add(otherUid);

      const userSnap = await firebase.database().ref("users/" + otherUid).once("value");
      const userData = userSnap.val();
      if (!userData) continue;

      const messagesSnap = await firebase.database().ref("chats/" + chatId).once("value");
      const messages = messagesSnap.val();
      if (!messages) continue;

      // Last message
      const lastMsgKey = Object.keys(messages).pop();
      const lastMsg = messages[lastMsgKey].text;

      // Check unread messages from other user
      let hasUnread = false;
      Object.values(messages).forEach(msg => {
        if (msg.sender !== currentUserId && !msg.read) hasUnread = true;
      });

      // Chat item UI
      const div = document.createElement("div");
      div.className = "chat-item";
      div.style.position = "relative";

      div.innerHTML = `
  <img src="${userData.photoURL || 'default.jpg'}" 
       style="width:50px; height:50px; border-radius:50%; object-fit:cover; margin-right:10px;">

  <div class="chat-info" style="display:flex; flex-direction:column; justify-content:center;">

    <div class="chat-name" style="display:flex; align-items:center; font-weight:${hasUnread ? 'bold' : 'normal'}; font-size:14px; gap:4px;">
      ${userData.username || "User"}
      ${userData.verified ? 
          '<img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" style="width:16px; height:16px;">' 
          : ''
      }
    </div>

    <div class="chat-last" style="font-size:13px; color:#555; margin-top:2px;">${lastMsg}</div>
  </div>
`;



      // Red dot if unread
      if (hasUnread) {
        const dot = document.createElement("span");
        dot.className = "unread-dot";
        dot.style.cssText = `
          width:8px;
          height:8px;
          background:red;
          border-radius:50%;
          position:absolute;
          top:12px;
          right:10px;
        `;
        div.appendChild(dot);
      }

      // On click → open chat & mark messages as read
      div.onclick = async () => {
        selectedUserId = otherUid;

        const chatRef = firebase.database().ref("chats/" + chatId);

        // Mark all messages from other user as read
        Object.keys(messages).forEach(msgId => {
          const msg = messages[msgId];
          if (msg.sender !== currentUserId && !msg.read) {
            chatRef.child(msgId).update({ read: true });
          }
        });

        openChat(otherUid, userData.username);

        // Remove red dot after opening chat
        const dotElem = div.querySelector(".unread-dot");
        if (dotElem) dotElem.remove();

        // Update unread count in index.html
        updateUnreadCount();
      };

      chatList.appendChild(div);
    }

    // Update unread count after loading list
    updateUnreadCount();
  });
}

// ---------- Open chat ----------
function openChat(otherUid, username) {
  selectedUserId = otherUid;
  chatUserName.innerText = username || "Chat";

  chatListScreen.style.display = "none";
  chatScreen.style.display = "flex";
  chatBox.innerHTML = "";

  const chatId = getChatId(currentUserId, selectedUserId);

  // Listen for new messages
  firebase.database().ref("chats/" + chatId).off();
  firebase.database().ref("chats/" + chatId).on("child_added", snap => {
    addMessage(snap.val());
  });
}

// ---------- Send message ----------
sendBtn.onclick = sendMessage;
msgInput.onkeydown = e => {
  if (e.key === "Enter") sendMessage();
};

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !selectedUserId) return;

  const chatId = getChatId(currentUserId, selectedUserId);

  firebase.database().ref("chats/" + chatId).push({
    sender: currentUserId,
    text: text,
    time: Date.now(),
    read: false
  });

  msgInput.value = "";
}

// ---------- Add message UI ----------
function addMessage(msg) {
  const div = document.createElement("div");
  div.className = "msg";

  if (msg.sender === currentUserId) {
    div.classList.add("sent");
  } else {
    div.classList.add("received");
  }

  div.innerText = msg.text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ---------- Chat ID system ----------
function getChatId(a, b) {
  return a < b ? a + "_" + b : b + "_" + a;
}

// ---------- Back buttons ----------
backBtn.onclick = () => {
  chatScreen.style.display = "none";
  chatListScreen.style.display = "flex";
};

listBackBtn.onclick = () => {
  window.location.href = "index.html";
};

// ---------- Optional: update index.html unread count ----------
function updateUnreadCount() {
  firebase.database().ref("chats").once("value").then(snapshot => {
    const chats = snapshot.val();
    if (!chats) return;
    let totalUnread = 0;

    Object.keys(chats).forEach(chatId => {
      const msgs = chats[chatId];
      Object.values(msgs).forEach(msg => {
        if (msg.sender !== currentUserId && !msg.read) totalUnread++;
      });
    });

    // Example: update badge in index.html
    const notifBadge = document.getElementById("notifBadge");
    if (notifBadge) {
      notifBadge.innerText = totalUnread > 0 ? totalUnread : "";
    }
  });
}

// Initial unread count
updateUnreadCount();
