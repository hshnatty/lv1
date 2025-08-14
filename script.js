// --- Firebase setup (v10 modular) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, getDocs, where, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

// ==== Your Firebase Config (safe to expose) ====
const firebaseConfig = {
  apiKey: "AIzaSyArgnPP7ZPdO86qT1wm7wqw_qS_IhNW1qk",
  authDomain: "lv1w-29520.firebaseapp.com",
  projectId: "lv1w-29520",
  storageBucket: "lv1w-29520.firebasestorage.app",
  messagingSenderId: "574419777057",
  appId: "1:574419777057:web:47db3d4ef8de155d269560",
  measurementId: "G-1QXRLXB33N"
};
const adminEmail = "hshnatty@gmail.com";

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM utilities
const $ = (sel) => document.querySelector(sel);
const byId = (id) => document.getElementById(id);

// Detect which page we're on
const isAdminPage = location.pathname.endsWith("admin.html");

// --- Shared Firestore helpers ---
async function uploadImageIfAny(file, currentUser) {
  if (!file) return null;
  const ts = Date.now();
  const safeName = file.name.replace(/\s+/g, "_");
  const userPart = currentUser?.uid || "anon";
  const storageRef = ref(storage, `uploads/${userPart}/${ts}_${safeName}`);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return url;
}

async function createMessage({ text, imageUrl = null, parentId = null, isAdmin = false, authorName = "Anonymous", authorEmail = null }) {
  if (!text && !imageUrl) return;
  await addDoc(collection(db, "messages"), {
    text: text || "",
    imageUrl: imageUrl || null,
    parentId: parentId || null,
    isAdmin: !!isAdmin,
    authorName: authorName || "Anonymous",
    authorEmail: authorEmail || null,
    createdAt: serverTimestamp()
  });
}

function formatTime(ts) {
  try {
    const d = ts?.toDate?.() ? ts.toDate() : new Date();
    return d.toLocaleString();
  } catch {
    return new Date().toLocaleString();
  }
}

// Build a tree of messages from flat list
function buildTree(items) {
  const map = new Map();
  items.forEach(m => map.set(m.id, { ...m, replies: [] }));
  const roots = [];
  map.forEach(node => {
    if (node.parentId) {
      const parent = map.get(node.parentId);
      if (parent) parent.replies.push(node);
      else roots.push(node); // Orphan – show at root
    } else {
      roots.push(node);
    }
  });
  // sort threads by time
  const sortRec = (arr) => {
    arr.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));
    arr.forEach(n => sortRec(n.replies));
  };
  sortRec(roots);
  return roots;
}

function renderMessage(node, depth = 0, options = {}) {
  const container = document.createElement("div");
  container.className = "message" + (node.isAdmin ? " admin-message" : "");
  container.style.marginLeft = depth > 0 ? `${Math.min(depth * 12, 120)}px` : "0";

  const header = document.createElement("div");
  header.className = "message-header";
  const author = document.createElement("div");
  author.className = "message-author";
  author.textContent = node.authorName || "Anonymous";
  const time = document.createElement("div");
  time.className = "message-time";
  time.textContent = formatTime(node.createdAt);
  header.appendChild(author);
  header.appendChild(time);

  const body = document.createElement("div");
  body.className = "message-body";
  body.textContent = node.text || "";

  container.appendChild(header);
  container.appendChild(body);

  if (node.imageUrl) {
    const img = document.createElement("img");
    img.src = node.imageUrl;
    img.alt = "attachment";
    img.className = "small-thumb";
    container.appendChild(img);
  }

  const actions = document.createElement("div");
  actions.className = "message-actions";

  // Reply button
  const replyBtn = document.createElement("button");
  replyBtn.textContent = "Reply";
  replyBtn.addEventListener("click", () => {
    replyForm.classList.toggle("hidden");
    replyInput.focus();
  });
  actions.appendChild(replyBtn);

  // Delete button only on admin page (and for admin account)
  if (options.canDelete) {
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "secondary";
    delBtn.addEventListener("click", async () => {
      if (!confirm("Delete this message and all its replies?")) return;
      await deleteThread(node.id);
    });
    actions.appendChild(delBtn);
  }

  container.appendChild(actions);

  // Inline reply form
  const replyForm = document.createElement("div");
  replyForm.className = "reply-form hidden";
  const replyInput = document.createElement("textarea");
  replyInput.rows = 2;
  replyInput.placeholder = "Write a reply...";
  const replyRow = document.createElement("div");
  replyRow.className = "composer-row";
  const replyFile = document.createElement("input");
  replyFile.type = "file"; replyFile.accept = "image/*";
  const replySend = document.createElement("button");
  replySend.textContent = "Send reply";
  replyRow.appendChild(replyFile);
  replyRow.appendChild(replySend);
  replyForm.appendChild(replyInput);
  replyForm.appendChild(replyRow);
  container.appendChild(replyForm);

  replySend.addEventListener("click", async () => {
    const file = replyFile.files?.[0] || null;
    const imgUrl = await uploadImageIfAny(file, auth.currentUser);
    const name = window.currentDisplayName || "Anonymous";
    await createMessage({
      text: replyInput.value.trim(),
      imageUrl: imgUrl,
      parentId: node.id,
      isAdmin: false,
      authorName: name,
      authorEmail: auth.currentUser?.email || null
    });
    replyInput.value = "";
    replyFile.value = "";
    replyForm.classList.add("hidden");
  });

  // Render replies
  if (node.replies?.length) {
    const repliesWrap = document.createElement("div");
    repliesWrap.className = "replies";
    node.replies.forEach(child => repliesWrap.appendChild(renderMessage(child, depth + 1, options)));
    container.appendChild(repliesWrap);
  }

  return container;
}

// Delete a message and all nested replies
async function deleteThread(rootId) {
  // gather all messages recursively that belong to this thread
  const q = query(collection(db, "messages"));
  const snap = await getDocs(q);
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const set = new Set();
  function collect(id) {
    set.add(id);
    for (const m of all) {
      if (m.parentId === id) collect(m.id);
    }
  }
  collect(rootId);

  const batch = writeBatch(db);
  for (const id of set) {
    batch.delete(doc(db, "messages", id));
  }
  await batch.commit();
}

// ================== INDEX PAGE ==================
async function initIndex() {
  const userStatus = byId("userStatus");
  const anonBtn = byId("anonSignInBtn");
  const signOutBtn = byId("signOutBtn");
  const displayNameInput = byId("displayName");
  const sendBtn = byId("sendBtn");
  const messageInput = byId("messageInput");
  const imageInput = byId("imageInput");
  const list = byId("messages");

  window.currentDisplayName = "";

  anonBtn?.addEventListener("click", async () => {
    if (!displayNameInput.value.trim()) {
      alert("Please enter a display name");
      return;
    }
    window.currentDisplayName = displayNameInput.value.trim();
    await signInAnonymously(auth);
  });

  signOutBtn?.addEventListener("click", () => signOut(auth));

  sendBtn?.addEventListener("click", async () => {
    const text = messageInput.value.trim();
    const file = imageInput.files?.[0] || null;
    const imageUrl = await uploadImageIfAny(file, auth.currentUser);
    await createMessage({
      text,
      imageUrl,
      parentId: null,
      isAdmin: false,
      authorName: window.currentDisplayName || "Anonymous",
      authorEmail: auth.currentUser?.email || null
    });
    messageInput.value = "";
    imageInput.value = "";
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      userStatus.textContent = `Signed in as ${window.currentDisplayName || "Anonymous"} ${user.isAnonymous ? "(anonymous)" : ""}`;
    } else {
      userStatus.textContent = "Not signed in";
    }
  });

  // Live messages
  const qAll = query(collection(db, "messages"), orderBy("createdAt"));
  onSnapshot(qAll, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const tree = buildTree(items);
    list.innerHTML = "";
    tree.forEach(node => list.appendChild(renderMessage(node, 0, { canDelete: false })));
  });
}

// ================== ADMIN PAGE ==================
async function initAdmin() {
  const emailInput = byId("adminEmailInput");
  const passInput = byId("adminPasswordInput");
  const signInBtn = byId("adminSignInBtn");
  const signOutBtn = byId("signOutBtn");
  const status = byId("adminStatus");
  const panel = byId("adminPanel");
  const adminSendBtn = byId("adminSendBtn");
  const adminMsgInput = byId("adminMessageInput");
  const adminImageInput = byId("adminImageInput");
  const adminStyleToggle = byId("adminStyleToggle");
  const adminList = byId("adminMessages");

  signInBtn?.addEventListener("click", async () => {
    try {
      await signInWithEmailAndPassword(auth, emailInput.value.trim(), passInput.value);
      passInput.value = "";
    } catch (e) {
      status.textContent = e.message;
    }
  });

  signOutBtn?.addEventListener("click", () => signOut(auth));

  onAuthStateChanged(auth, (user) => {
    if (user?.email === adminEmail) {
      status.textContent = `Signed in as admin: ${user.email}`;
      panel.classList.remove("hidden");
    } else if (user) {
      status.textContent = `Signed in as ${user.email || "user"} (no admin rights)`;
      panel.classList.add("hidden");
    } else {
      status.textContent = "Not signed in";
      panel.classList.add("hidden");
    }
  });

  adminSendBtn?.addEventListener("click", async () => {
    const text = adminMsgInput.value.trim();
    const file = adminImageInput.files?.[0] || null;
    const imgUrl = await uploadImageIfAny(file, auth.currentUser);
    await createMessage({
      text,
      imageUrl: imgUrl,
      parentId: null,
      isAdmin: adminStyleToggle.checked,
      authorName: "Admin",
      authorEmail: auth.currentUser?.email || null
    });
    adminMsgInput.value = "";
    adminImageInput.value = "";
  });

  // Live listing with delete
  const qAll = query(collection(db, "messages"), orderBy("createdAt"));
  onSnapshot(qAll, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const tree = buildTree(items);
    adminList.innerHTML = "";
    tree.forEach(node => adminList.appendChild(renderMessage(node, 0, { canDelete: true })));
  });
}

// Entry
if (isAdminPage) {
  initAdmin();
} else {
  initIndex();
}

// ===== Developer notes =====
// Firestore security rules recommendation (set in Firebase console):
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /messages/{docId} {
//       allow read: if true; // public read
//       allow create: if request.auth != null; // must be signed in (anonymous or email)
//       allow delete: if request.auth.token.email == '${adminEmail}';
//       allow update: if false; // optional: prevent edits
//     }
//   }
// }
// For Storage, limit writes to authenticated users and reads public OR via rules you prefer.
