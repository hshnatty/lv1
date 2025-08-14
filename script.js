// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyArgnPP7ZPdO86qT1wm7wqw_qS_IhNW1qk",
    authDomain: "lv1w-29520.firebaseapp.com",
    projectId: "lv1w-29520",
    storageBucket: "lv1w-29520.firebasestorage.app",
    messagingSenderId: "574419777057",
    appId: "1:574419777057:web:47db3d4ef8de155d269560",
    measurementId: "G-1QXRLXB33N"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// User authentication and posts logic
let userId = null;
let userName = null;

// Firestore listener cleanups
let unsubscribePosts = null;
const replyUnsubscribers = {}; // { [postId]: () => void }

// Restore login on page reload
auth.onAuthStateChanged((user) => {
    if (user) {
        userId = user.uid;
        userName = user.displayName || `User-${Math.floor(Math.random() * 10000)}`;
        document.getElementById("user-name").innerText = `Welcome, ${userName}`;
        loadPosts(); // start live updates
        toggleVisibility("forum-container");
        toggleVisibility("login-container", false);
    } else {
        cleanupListeners();
        toggleVisibility("login-container");
        toggleVisibility("forum-container", false);
    }
});

const login = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((result) => {
        userId = result.user.uid;
        userName = result.user.displayName || `User-${Math.floor(Math.random() * 10000)}`;
        document.getElementById("user-name").innerText = `Welcome, ${userName}`;
        // onAuthStateChanged will call loadPosts()
        toggleVisibility("forum-container");
        toggleVisibility("login-container", false); // Hide login after successful login
    }).catch((error) => {
        console.error("Login Error: ", error);
    });
};

const logout = () => {
    auth.signOut().then(() => {
        cleanupListeners();
        toggleVisibility("login-container");
        toggleVisibility("forum-container", false);
    }).catch((error) => {
        console.error("Logout Error: ", error);
    });
};

const submitPost = () => {
    const postText = document.getElementById("post-text").value;
    if (postText.trim() !== "") {
        db.collection("posts").add({
            userId: userId,
            userName: userName,
            content: postText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            document.getElementById("post-text").value = "";
        }).catch((err) => console.error("Post Error:", err));
    }
};

// ---- Replies ----
function submitReply(postId) {
    if (!userId) {
        alert("Please log in to reply.");
        return;
    }
    const input = document.getElementById(`reply-input-${postId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    db.collection("posts").doc(postId).collection("replies").add({
        userId: userId,
        userName: userName,
        content: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        input.value = "";
    }).catch((err) => console.error("Reply Error:", err));
}

function loadReplies(postId) {
    const repliesDiv = document.getElementById(`replies-${postId}`);
    if (!repliesDiv) return;

    // Remove old listener if any
    if (replyUnsubscribers[postId]) {
        replyUnsubscribers[postId]();
        delete replyUnsubscribers[postId];
    }

    replyUnsubscribers[postId] = db.collection("posts").doc(postId)
        .collection("replies").orderBy("timestamp", "asc")
        .onSnapshot((qs) => {
            repliesDiv.innerHTML = "";
            qs.forEach((replyDoc) => {
                const r = replyDoc.data();
                const rTs = r.timestamp ? new Date(r.timestamp.seconds * 1000).toLocaleString() : "";
                const el = document.createElement("div");
                el.className = "reply";
                el.innerHTML = `
                    <strong>${escapeHtml(r.userName || "User")}:</strong>
                    <span>${escapeHtml(r.content)}</span>
                    <small style="margin-left:6px;">${rTs}</small>
                `;
                repliesDiv.appendChild(el);
            });
        }, (err) => console.error("Replies listener error:", err));
}

// ---- Posts (live) ----
function loadPosts() {
    // Avoid duplicate listeners
    if (unsubscribePosts) {
        unsubscribePosts();
        unsubscribePosts = null;
    }
    // Clear existing reply listeners
    Object.values(replyUnsubscribers).forEach((unsub) => unsub && unsub());
    for (const k in replyUnsubscribers) delete replyUnsubscribers[k];

    const postsDiv = document.getElementById("posts");
    postsDiv.innerHTML = "";

    unsubscribePosts = db.collection("posts").orderBy("timestamp", "desc")
        .onSnapshot((querySnapshot) => {
            postsDiv.innerHTML = "";

            querySnapshot.forEach((doc) => {
                const postId = doc.id;
                const postData = doc.data();
                const ts = postData.timestamp ? new Date(postData.timestamp.seconds * 1000).toLocaleString() : "Unknown";

                const postElement = document.createElement("div");
                postElement.className = "post";
                postElement.innerHTML = `
                    <h3>${escapeHtml(postData.userName || "Anonymous")}</h3>
                    <p>${escapeHtml(postData.content || "")}</p>
                    <small>Posted on ${ts}</small>

                    <div id="replies-${postId}" class="replies" style="margin-top:8px;"></div>

                    ${userId ? `
                        <div class="reply-composer" style="margin-top:6px;">
                            <input id="reply-input-${postId}" placeholder="Write a reply..." style="width:70%; padding:6px;" />
                            <button onclick="submitReply('${postId}')" style="padding:6px 10px;">Reply</button>
                        </div>
                    ` : `<div class="reply-login-hint"><small>Log in to reply.</small></div>`}
                `;

                postsDiv.appendChild(postElement);

                // Start live replies listener for this post
                loadReplies(postId);
            });
        }, (err) => console.error("Posts listener error:", err));
}

function cleanupListeners() {
    if (unsubscribePosts) {
        unsubscribePosts();
        unsubscribePosts = null;
    }
    Object.values(replyUnsubscribers).forEach((unsub) => unsub && unsub());
    for (const k in replyUnsubscribers) delete replyUnsubscribers[k];
}

// Utility: basic HTML escaping to prevent injection
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const toggleVisibility = (id, show = true) => {
    document.getElementById(id).style.display = show ? "block" : "none";
};
