import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  limit,
  deleteDoc,
  doc,
  updateDoc,
  increment,
  getCountFromServer
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
let lastTypingTime = 0;
let typingTimeout;
let isTyping = false;

// Get calm color based on user ID
function getUserColor() {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    localStorage.setItem("userId", newId);
  }
  
  const colors = [
    "#e8f4f8", // Soft blue
    "#f5f0eb", // Warm beige
    "#f0f7e6", // Gentle green
    "#f8f0f5", // Soft pink
    "#f0f4f8", // Cool gray
    "#f5f5f0", // Cream
    "#e8f5e8", // Mint
    "#f8f8f0"  // Ivory
  ];
  
  const storedId = localStorage.getItem("userId");
  const index = parseInt(storedId, 36) % colors.length;
  return colors[index];
}

const userColor = getUserColor();

// Real-time listener for posts
function setupRealtimeListener() {
  const q = query(postsRef, orderBy("createdAt", "asc"));
  
  onSnapshot(q, (snapshot) => {
    const messages = document.getElementById("messages");
    messages.innerHTML = "";
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      createMessageElement(docSnap.id, data);
    });
    
    messages.scrollTop = messages.scrollHeight;
  });
}

// Create message element
function createMessageElement(postId, data) {
  const messages = document.getElementById("messages");
  
  const wrapper = document.createElement("div");
  wrapper.className = "message";
  wrapper.style.background = data.color || userColor;
  
  const text = document.createElement("div");
  text.textContent = data.content;
  
  const timestamp = document.createElement("div");
  timestamp.className = "timestamp";
  timestamp.textContent = formatTimestamp(data.createdAt?.toDate());
  
  const reactions = document.createElement("div");
  reactions.className = "reactions";
  
  ["like", "heart", "insight"].forEach(type => {
    const btn = document.createElement("span");
    const emoji = type === "like" ? "👍" : type === "heart" ? "❤️" : "💡";
    btn.textContent = `${emoji} ${data.reactions?.[type] || 0}`;
    
    btn.onclick = () => reactToPost(postId, type);
    if (hasReacted(postId, type)) {
      btn.style.opacity = "0.4";
      btn.style.cursor = "default";
    }
    reactions.appendChild(btn);
  });
  
  wrapper.appendChild(text);
  wrapper.appendChild(timestamp);
  wrapper.appendChild(reactions);
  messages.appendChild(wrapper);
}

// Format timestamp
function formatTimestamp(date) {
  if (!date) return "";
  
  const now = new Date();
  const diff = now - date;
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `Today at ${hours}:${minutes}`;
  if (diff < 172800000) return `Yesterday at ${hours}:${minutes}`;
  
  return `${date.getDate()}/${date.getMonth()+1} ${hours}:${minutes}`;
}

// Typing indicator
function setupTypingIndicator() {
  const textarea = document.getElementById("postText");
  const typingIndicator = document.getElementById("typingIndicator");
  
  textarea.addEventListener('input', () => {
    if (!isTyping && textarea.value.trim()) {
      isTyping = true;
      typingIndicator.style.display = 'block';
    }
    
    lastTypingTime = Date.now();
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      if (Date.now() - lastTypingTime > 2000) {
        isTyping = false;
        typingIndicator.style.display = 'none';
      }
    }, 2000);
  });
  
  textarea.addEventListener('blur', () => {
    isTyping = false;
    typingIndicator.style.display = 'none';
  });
}

// Submit post
window.submitPost = async () => {
  const textarea = document.getElementById("postText");
  const text = textarea.value.trim();
  
  if (!text) {
    textarea.focus();
    return;
  }
  
  if (text.length > 1000) {
    alert("Thoughts are precious, but please keep them under 1000 characters");
    return;
  }
  
  try {
    await addDoc(postsRef, {
      content: text,
      createdAt: new Date(),
      color: userColor,
      userId: localStorage.getItem("userId")
    });
    
    await enforceThreshold();
    textarea.value = "";
    textarea.style.height = 'auto';
    
    // Hide typing indicator
    isTyping = false;
    document.getElementById("typingIndicator").style.display = 'none';
    
  } catch (error) {
    console.error("Error sharing thought:", error);
    alert("The thought couldn't be shared. Please try again.");
  }
};

// Auto-resize textarea
function setupTextareaAutoResize() {
  const textarea = document.getElementById("postText");
  
  textarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
  
  // Enter to submit (Shift+Enter for new line)
  textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitPost();
    }
  });
}

// Enforce message limit
async function enforceThreshold() {
  const q = query(
    postsRef,
    orderBy("createdAt", "desc"),
    limit(MAX_MESSAGES + 50)
  );
  
  const snapshot = await getCountFromServer(q);
  
  if (snapshot.data().count <= MAX_MESSAGES) return;
  
  const deleteQ = query(postsRef, orderBy("createdAt", "asc"), limit(50));
  const deleteSnapshot = await getDocs(deleteQ);
  
  for (const docSnap of deleteSnapshot.docs) {
    await deleteDoc(docSnap.ref);
  }
}

// Reaction system
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
  
  try {
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      [`reactions.${type}`]: increment(1)
    });
    
    markReacted(postId, type);
  } catch (error) {
    console.error("Error reacting:", error);
  }
}

// Update online count periodically
async function updateOnlineCount() {
  const onlineCountElement = document.getElementById("onlineCount");
  
  setInterval(() => {
    const isOnline = navigator.onLine;
    onlineCountElement.textContent = isOnline ? "Connected" : "Reflecting offline";
    onlineCountElement.style.color = isOnline ? "#4CAF50" : "#999";
  }, 5000);
}

// Initialize everything
function init() {
  setupRealtimeListener();
  setupTypingIndicator();
  setupTextareaAutoResize();
  updateOnlineCount();
  
  // Load initial messages
  const q = query(postsRef, orderBy("createdAt", "asc"));
  onSnapshot(q, (snapshot) => {
    const messages = document.getElementById("messages");
    messages.innerHTML = "";
    
    snapshot.forEach(docSnap => {
      createMessageElement(docSnap.id, docSnap.data());
    });
    
    messages.scrollTop = messages.scrollHeight;
  });
}

// Start the app
document.addEventListener('DOMContentLoaded', init);