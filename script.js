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

let userId = null;
let userName = null;

// Restore login on reload
auth.onAuthStateChanged((user) => {
    if (user) {
        userId = user.uid;

        // Check if username exists in Firestore
        db.collection("users").doc(userId).get().then(doc => {
            if (doc.exists && doc.data().username) {
                userName = doc.data().username;
                document.getElementById("user-name").innerText = `Welcome, ${userName}`;
                loadPosts();
                toggleVisibility("forum-container");
                toggleVisibility("login-container", false);
                toggleVisibility("username-setup", false);
            } else {
                // Show username setup form
                toggleVisibility("username-setup", true);
                toggleVisibility("login-container", false);
                toggleVisibility("forum-container", false);
            }
        });

    } else {
        toggleVisibility("login-container");
        toggleVisibility("forum-container", false);
        toggleVisibility("username-setup", false);
    }
});

// Login with Google
const login = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((error) => {
        console.error("Login Error: ", error);
    });
};

// Save username from HTML form
function saveUsername() {
    const enteredName = document.getElementById("username-input").value.trim();
    if (!enteredName) {
        alert("Please enter a username");
        return;
    }

    db.collection("users").doc(userId).set({
        username: enteredName
    }).then(() => {
        userName = enteredName;
        document.getElementById("user-name").innerText = `Welcome, ${userName}`;
        toggleVisibility("username-setup", false);
        toggleVisibility("forum-container", true);
        loadPosts();
    }).catch(err => console.error("Error saving username:", err));
}

// Logout
const logout = () => {
    auth.signOut().then(() => {
        toggleVisibility("login-container");
        toggleVisibility("forum-container", false);
        toggleVisibility("username-setup", false);
    }).catch((error) => {
        console.error("Logout Error: ", error);
    });
};

// Submit a post
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
            loadPosts();
        });
    }
};

// Submit a reply
const submitReply = (postId) => {
    const replyInput = document.getElementById(`reply-input-${postId}`);
    const replyText = replyInput.value;
    if (replyText.trim() !== "") {
        db.collection("posts").doc(postId).collection("replies").add({
            userId: userId,
            userName: userName,
            content: replyText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            replyInput.value = "";
            loadPosts();
        });
    }
};

// Load posts & replies
const loadPosts = () => {
    db.collection("posts").orderBy("timestamp", "desc").get().then(async (querySnapshot) => {
        const postsDiv = document.getElementById("posts");
        postsDiv.innerHTML = "";
        for (const doc of querySnapshot.docs) {
            const postData = doc.data();
            const postId = doc.id;

            const postElement = document.createElement("div");
            postElement.innerHTML = `
                <h3>${postData.userName}</h3>
                <p>${postData.content}</p>
                <small>Posted on ${postData.timestamp ? new Date(postData.timestamp.seconds * 1000).toLocaleString() : "Unknown"}</small>
                <div>
                    <input type="text" id="reply-input-${postId}" placeholder="Write a reply..." />
                    <button onclick="submitReply('${postId}')">Reply</button>
                </div>
                <div id="replies-${postId}" class="replies"></div>
                <hr>
            `;
            postsDiv.appendChild(postElement);

            const repliesSnap = await db.collection("posts").doc(postId).collection("replies").orderBy("timestamp", "asc").get();
            const repliesDiv = document.getElementById(`replies-${postId}`);
            repliesSnap.forEach(replyDoc => {
                const replyData = replyDoc.data();
                const replyElement = document.createElement("div");
                replyElement.style.marginLeft = "20px";
                replyElement.innerHTML = `
                    <strong>${replyData.userName}:</strong> ${replyData.content}
                    <br><small>${replyData.timestamp ? new Date(replyData.timestamp.seconds * 1000).toLocaleString() : "Unknown"}</small>
                `;
                repliesDiv.appendChild(replyElement);
            });
        }
    });
};

// Toggle visibility helper
const toggleVisibility = (id, show = true) => {
    document.getElementById(id).style.display = show ? "block" : "none";
};
