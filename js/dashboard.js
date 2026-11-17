import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  ref,
  onValue,
  get,
  push,
  set,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { auth, db } from "../firebase-config.js";

const contactList = document.getElementById("contactList");
const searchUsers = document.getElementById("searchUsers");
const userAvatar = document.getElementById("userAvatar");
const profileName = document.getElementById("profileName");
const logoutBtn = document.getElementById("logoutBtn");

const chatWelcome = document.getElementById("chatWelcome");
const chatPanel = document.getElementById("chatPanel");
const chatTitle = document.getElementById("chatTitle");
const chatSubtitle = document.getElementById("chatSubtitle");
const messagesList = document.getElementById("messagesList");

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let currentUser = null;
let allUsers = {};
let selectedUser = null;
let currentChatId = null;
let stopMessagesListener = null;

function formatMessageTime(timestamp) {
  if (!timestamp) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi"
  }).format(new Date(timestamp)).replace(",", " ·");
}

function makeChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

function showContactError(message) {
  contactList.replaceChildren();

  const error = document.createElement("div");
  error.className = "empty-contacts";
  error.textContent = message;

  contactList.appendChild(error);
}

async function loadMyProfile() {
  try {
    const snapshot = await get(ref(db, `users/${currentUser.uid}`));
    const profile = snapshot.val() || {};

    const name =
      currentUser.displayName ||
      profile.name ||
      currentUser.email ||
      "User";

    profileName.textContent = name;
    userAvatar.textContent = name.charAt(0).toUpperCase();

  } catch (error) {
    console.error("Profile error:", error);
    profileName.textContent = currentUser.email || "User";
    userAvatar.textContent = "U";
  }
}

function loadUsers() {
  onValue(
    ref(db, "users"),
    (snapshot) => {
      allUsers = snapshot.val() || {};
      renderUsers();
    },
    (error) => {
      console.error("Users error:", error);
      showContactError("Could not load users. Check Firebase Rules.");
    }
  );
}

function renderUsers() {
  contactList.replaceChildren();

  const searchText = searchUsers.value.trim().toLowerCase();

  const users = Object.entries(allUsers)
    .filter(([uid]) => uid !== currentUser.uid)
    .map(([uid, data]) => ({ uid, ...data }))
    .filter((user) =>
      (user.name || user.email || "User")
        .toLowerCase()
        .includes(searchText)
    );

  users.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );

  if (users.length === 0) {
    showContactError(
      searchText ? "No matching users found." : "No users found."
    );
    return;
  }

  users.forEach((user) => {
    const name = user.name || user.email || "User";

    const item = document.createElement("div");
    item.className = "contact-item";

    if (selectedUser?.uid === user.uid) {
      item.classList.add("active");
    }

    const avatar = document.createElement("div");
    avatar.className = "contact-avatar";
    avatar.textContent = name.charAt(0).toUpperCase();

    const info = document.createElement("div");
    info.className = "contact-info";

    const userName = document.createElement("div");
    userName.className = "contact-name";
    userName.textContent = name;

    const status = document.createElement("div");
    status.className = "contact-status";
    status.textContent =
      user.status === "online" ? "Online" : "Offline";

    info.append(userName, status);
    item.append(avatar, info);

    item.addEventListener("click", () => openChat(user));

    contactList.appendChild(item);
  });
}

async function openChat(user) {
  selectedUser = user;
  currentChatId = makeChatId(currentUser.uid, user.uid);

  renderUsers();

  chatWelcome.hidden = true;
  chatPanel.hidden = false;

  chatTitle.textContent = user.name || user.email || "User";
  chatSubtitle.textContent = "ChatBox conversation";

  messagesList.replaceChildren();

  if (stopMessagesListener) {
    stopMessagesListener();
    stopMessagesListener = null;
  }

  const chatRef = ref(db, `chats/${currentChatId}`);

  try {
    await update(chatRef, {
      [`members/${currentUser.uid}`]: true,
      [`members/${user.uid}`]: true
    });

    const messagesRef = ref(
      db,
      `chats/${currentChatId}/messages`
    );

    stopMessagesListener = onValue(
      messagesRef,
      (snapshot) => {
        renderMessages(snapshot.val() || {});
      },
      (error) => {
        console.error("Messages error:", error);
        messagesList.textContent =
          "Chat could not open. Check Firebase Rules.";
      }
    );

  } catch (error) {
    console.error("Opening chat error:", error);
    messagesList.textContent =
      "Chat could not open. Check Firebase Rules.";
  }
}

// MESSAGE DISPLAY + THREE DOTS MENU

function renderMessages(messages) {
  messagesList.replaceChildren();

  const entries = Object.entries(messages).sort(
    (a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0)
  );

  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-contacts";
    empty.textContent = "No messages yet. Say hello!";
    messagesList.appendChild(empty);
    return;
  }

  entries.forEach(([messageId, message]) => {
    const bubble = document.createElement("div");
    const isMine = message.senderId === currentUser.uid;

    bubble.className = isMine ? "message mine" : "message";

    const topRow = document.createElement("div");
    topRow.className = "message-top";

    const text = document.createElement("div");
    text.className = "message-text";
    text.textContent = message.text || "";

    topRow.appendChild(text);

    // Three dots sirf apne messages par
    if (isMine) {
      const menuWrapper = document.createElement("div");
      menuWrapper.className = "message-menu-wrapper";

      const dotsButton = document.createElement("button");
      dotsButton.type = "button";
      dotsButton.className = "message-dots";
      dotsButton.textContent = "⋮";
      dotsButton.setAttribute("aria-label", "Message options");

      const menu = document.createElement("div");
      menu.className = "message-menu";
      menu.hidden = true;

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "message-menu-item";
      editButton.textContent = "✏️  Edit";

      editButton.addEventListener("click", (event) => {
        event.stopPropagation();
        menu.hidden = true;
        editMessage(messageId, message.text || "");
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "message-menu-item delete-item";
      deleteButton.textContent = "🗑️  Delete";

      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        menu.hidden = true;
        deleteMessage(messageId);
      });

      dotsButton.addEventListener("click", (event) => {
        event.stopPropagation();

        document.querySelectorAll(".message-menu").forEach((otherMenu) => {
          if (otherMenu !== menu) {
            otherMenu.hidden = true;
          }
        });

        menu.hidden = !menu.hidden;
      });

      menu.append(editButton, deleteButton);
      menuWrapper.append(dotsButton, menu);
      topRow.appendChild(menuWrapper);
    }

    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent =
      formatMessageTime(message.timestamp) +
      (message.editedAt ? " · edited" : "");

    bubble.append(topRow, time);
    messagesList.appendChild(bubble);
  });

  messagesList.scrollTop = messagesList.scrollHeight;
}

// Outside click par menu close
document.addEventListener("click", () => {
  document.querySelectorAll(".message-menu").forEach((menu) => {
    menu.hidden = true;
  });
});

// SEND MESSAGE

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = messageInput.value.trim();

  if (!text || !currentUser || !currentChatId) return;

  sendBtn.disabled = true;

  try {
    const messagesRef = ref(
      db,
      `chats/${currentChatId}/messages`
    );

    const newMessageRef = push(messagesRef);

    await set(newMessageRef, {
      senderId: currentUser.uid,
      text,
      timestamp: Date.now()
    });

    messageInput.value = "";
    messageInput.focus();

  } catch (error) {
    console.error("Send error:", error);
    alert("Message could not be sent. Check Firebase Rules.");
  } finally {
    sendBtn.disabled = false;
  }
});

// EDIT MESSAGE

async function editMessage(messageId, oldText) {
  const newText = prompt("Edit your message:", oldText);

  if (newText === null) return;

  const cleanText = newText.trim();

  if (!cleanText || cleanText.length > 2000) {
    alert("Enter a message between 1 and 2000 characters.");
    return;
  }

  try {
    await update(
      ref(db, `chats/${currentChatId}/messages/${messageId}`),
      {
        text: cleanText,
        editedAt: Date.now()
      }
    );
  } catch (error) {
    console.error("Edit error:", error);
    alert("Could not edit message. Check Firebase Rules.");
  }
}

// DELETE MESSAGE

async function deleteMessage(messageId) {
  if (!confirm("Delete this message?")) return;

  try {
    await remove(
      ref(db, `chats/${currentChatId}/messages/${messageId}`)
    );
  } catch (error) {
    console.error("Delete error:", error);
    alert("Could not delete message. Check Firebase Rules.");
  }
}

// SEARCH USERS

searchUsers.addEventListener("input", renderUsers);


logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Could not log out.");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  await loadMyProfile();
  loadUsers();
});