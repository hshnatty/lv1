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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// User data
let userId = null;
let userName = null;
let isAdminUser = false;

// Check if user is admin
const checkAdmin = async (uid) => {
    const userDoc = await db.collection("users").doc(uid).get();
    return userDoc.exists && userDoc.data().isAdmin === true;
};

// Login
const login = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(async (result) => {
            userId = result.user.uid;
            userName = result.user.displayName || `User-${Math.floor(Math.random() * 10000)}`;
            isAdminUser = await checkAdmin(userId);

            document.getElementById("user-name").innerText = `Welcome, ${userName}`;
            showForum();
            loadPosts();
        })
        .catch((error) => {
            console.error("Login Error:", error);
        });
};

// Logout
const logout = () => {
    auth.signOut()
        .then(() => {
            showLogin();
        })
        .catch((error) => {
            console.error("Logout Error:", error);
        });
};

// Show forum, hide login
const showForum = () => {
    document.getElementById("login-container").style.display = "none";
    document.getElementById("forum-container").style.display = "block";
};

// Show login, hide forum
const showLogin = () => {
    document.getElementById("login-container").style.display = "flex"; // flex so it's centered
    document.getElementById("forum-container").style.display = "none";
};

// Submit a new post
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

// Delete post
const deletePost = (postId) => {
    db.collection("posts").doc(postId).delete()
        .then(() => {
            console.log("Post deleted:", postId);
            loadPosts();
        })
        .catch((error) => {
            console.error("Delete Error:", error);
        });
};

