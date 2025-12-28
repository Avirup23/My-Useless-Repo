import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAO_pnpn8XrUsg5foSwDc1Ef2anwYlxDG0",
    authDomain: "i-have-some-thoughts.firebaseapp.com",
    projectId: "i-have-some-thoughts",
    storageBucket: "i-have-some-thoughts.firebasestorage.app",
    messagingSenderId: "1074938809862",
    appId: "1:1074938809862:web:3c5c1ca040e6163dc83d87"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const postsRef = collection(db, "posts");

const MAX_MESSAGES = 500;

import { deleteDoc, limit } from 
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function enforceThreshold() {
  const q = query(
    postsRef,
    orderBy("createdAt", "desc"),
    limit(MAX_MESSAGES + 1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.size <= MAX_MESSAGES) return;

  const docs = snapshot.docs;
  const excess = docs.slice(MAX_MESSAGES);

  for (const d of excess) {
    await deleteDoc(d.ref);
  }
}

function getUserColor() {
  let color = localStorage.getItem("userColor");
  if (!color) {
    const colors = ["#dcf8c6", "#fff3cd", "#d1e7dd", "#f8d7da", "#e2e3ff"];
    color = colors[Math.floor(Math.random() * colors.length)];
    localStorage.setItem("userColor", color);
  }
  return color;
}

const userColor = getUserColor();


window.submitPost = async () => {
  const text = document.getElementById("postText").value.trim();
  if (!text) return;

  await addDoc(postsRef, {
    content: text,
    createdAt: new Date(),
    color: userColor
  });

  await enforceThreshold();
  document.getElementById("postText").value = "";
  loadPosts();
};

async function loadPosts() {
  const q = query(postsRef, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);

  const messages = document.getElementById("messages");
  messages.innerHTML = "";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    const wrapper = document.createElement("div");
    wrapper.className = "message";
    wrapper.style.background = data.color || "#fff";

    const text = document.createElement("div");
    text.textContent = data.content;

    const reactions = document.createElement("div");
    reactions.className = "reactions";

    ["like", "heart", "laugh"].forEach(type => {
      const btn = document.createElement("span");
      btn.textContent =
        (type === "like" ? "👍" : type === "heart" ? "❤️" : "😂") +
        " " + (data.reactions?.[type] || 0);

      btn.onclick = () => reactToPost(docSnap.id, type);
      reactions.appendChild(btn);
    });

    wrapper.appendChild(text);
    wrapper.appendChild(reactions);
    messages.appendChild(wrapper);
  });

  messages.scrollTop = messages.scrollHeight;
}

import { doc, updateDoc, increment } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function hasReacted(postId, type) {
  const key = `reacted_${postId}_${type}`;
  return localStorage.getItem(key) === "1";
}

function markReacted(postId, type) {
  const key = `reacted_${postId}_${type}`;
  localStorage.setItem(key, "1");
}

async function reactToPost(postId, type) {
  if (hasReacted(postId, type)) return;

  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    [`reactions.${type}`]: increment(1)
  });

  markReacted(postId, type);
  loadPosts();
}


loadPosts();
