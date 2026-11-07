const API = "/.netlify/functions";

let supabaseClient;
let currentUser = null;
let currentConversationId = null;
let currentDocumentText = "";
let currentFileName = "";
let authMode = "login";
let conversations = [];
let toastTimer;

const $ = (id) => document.getElementById(id);

function showMessage(element, message, type = "") {
  element.textContent = message;
  element.className = `message ${type}`;
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

function showScreen(screen) {
  $("loadingScreen").classList.add("hidden");
  $("authScreen").classList.toggle("hidden", screen !== "auth");
  $("appScreen").classList.toggle("hidden", screen !== "app");
}

async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function apiRequest(endpoint, options = {}) {
  const session = await getSession();

  if (!session) {
    showScreen("auth");
    throw new Error("انتهت جلسة تسجيل الدخول. سجل الدخول مرة أخرى.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${session.access_token}`);

  const response = await fetch(`${API}/${endpoint}`, {
    ...options,
    headers
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("استجابة غير مفهومة من الخادم.");
  }

  if (!response.ok || result.success === false) {
    throw new Error(result.error || "حدث خطأ أثناء تنفيذ الطلب.");
  }

  return result;
}

function setAuthMode(mode) {
  authMode = mode;
  $("loginTab").classList.toggle("active", mode === "login");
  $("signupTab").classList.toggle("active", mode === "signup");
  $("authSubmit").textContent = mode === "login" ? "تسجيل الدخول" : "إنشاء حساب";
  $("password").autocomplete = mode === "login" ? "current-password" : "new-password";
  showMessage($("authMessage"), "");
}

async function initialize() {
  try {
    const configResponse = await fetch(`${API}/config`);
    if (!configResponse.ok) throw new Error("تعذر تحميل إعدادات التطبيق.");

    const config = await configResponse.json();

    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error("إعدادات Supabase غير مكتملة في Netlify.");
    }

    if (!window.supabase) {
      throw new Error("تعذر تحميل مكتبة Supabase.");
    }

    supabaseClient = window.supabase.createClient(
      config.supabaseUrl,
      config.supabaseKey,
      {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      }
    );

    const url = new URL(window.location.href);
    const authCode = url.searchParams.get("code");

    if (authCode) {
      const { error } = await supabaseClient.auth.exchangeCodeForSession(authCode);
      if (error) throw error;
      window.history.replaceState({}, document.title, "/");
    }

    const session = await getSession();

    if (session) {
      currentUser = session.user;
      await enterApp();
    } else {
      showScreen("auth");
    }

    supabaseClient.auth.onAuthStateChange(async (event, sessionData) => {
      if (event === "SIGNED_OUT") {
        currentUser = null;
        showScreen("auth");
      } else if (sessionData && !currentUser) {
        currentUser = sessionData.user;
        await enterApp();
      }
    });

  } catch (error) {
    showScreen("auth");
    showMessage($("authMessage"), error.message, "error");
  }
}

async function enterApp() {
  showScreen("app");
  $("userEmail").textContent = currentUser?.email || "";
  await loadConversations();
}

async function loadConversations() {
  try {
    const result = await apiRequest("conversations");
    conversations = result.conversations || [];
    renderConversations();
  } catch (error) {
    showToast(error.message);
  }
}

function renderConversations() {
  const list = $("conversationList");
  list.replaceChildren();

  if (!conversations.length) {
    const empty = document.createElement("p");
    empty.className = "muted small-text";
    empty.textContent = "لا توجد محادثات بعد";
    list.appendChild(empty);
    return;
  }

  conversations.forEach((conversation) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "conversation-item";
    if (conversation.id === currentConversationId) {
      button.classList.add("active");
    }

    button.textContent = conversation.title || conversation.file_name || "محادثة جديدة";
    button.addEventListener("click", () => openConversation(conversation.id));
    list.appendChild(button);
  });
}

function resetWorkspace() {
  currentConversationId = null;
  currentDocumentText = "";
  currentFileName = "";

  $("pdfInput").value = "";
  $("documentPanel").classList.add("hidden");
  $("welcomePanel").classList.remove("hidden");
  $("documentName").textContent = "";
  $("chatMessages").replaceChildren();
  showMessage($("uploadStatus"), "");
  renderConversations();
}

async function uploadPDF(file) {
  if (!file) return;

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    showMessage($("uploadStatus"), "يرجى اختيار ملف PDF فقط.", "error");
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    showMessage($("uploadStatus"), "حجم الملف يتجاوز الحد المسموح وهو 20 ميغابايت.", "error");
    return;
  }

  const uploadStatus = $("uploadStatus");
  showMessage(uploadStatus, "جاري رفع الملف واستخراج النص...");

  $("pdfInput").disabled = true;

  try {
    const formData = new FormData();
    formData.append("file", file);

    const result = await apiRequest("pdf", {
      method: "POST",
      body: formData
    });

    currentDocumentText = result.text;
    currentFileName = result.fileName || file.name;

    const conversationResult = await apiRequest("conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: currentFileName,
        fileName: currentFileName,
        documentText: currentDocumentText
      })
    });

    currentConversationId = conversationResult.conversation.id;

    $("documentName").textContent = currentFileName;
    $("documentStatus").textContent = "تم استخراج نص المستند بنجاح";
    $("welcomePanel").classList.add("hidden");
    $("documentPanel").classList.remove("hidden");

    $("chatMessages").replaceChildren();
    addMessage("assistant", "تم تحميل المستند بنجاح. يمكنك الآن طرح أسئلتك حول محتواه.");

    showMessage(uploadStatus, "");
    await loadConversations();
    $("questionInput").focus();

  } catch (error) {
    showMessage(uploadStatus, error.message, "error");
  } finally {
    $("pdfInput").disabled = false;
    $("pdfInput").value = "";
  }
}

function addMessage(role, content) {
  const container = $("chatMessages");
  const message = document.createElement("div");
  message.className = `chat-message ${role}`;

  const label = document.createElement("span");
  label.className = "message-role";
  label.textContent = role === "user" ? "أنت" : "TA27A AI";

  const text = document.createElement("div");
  text.textContent = content;

  message.append(label, text);
  container.appendChild(message);
  container.scrollTop = container.scrollHeight;
  return message;
}

async function saveMessage(role, content) {
  return apiRequest("messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: currentConversationId,
      role,
      content
    })
  });
}

function createAgentProgress() {
  const container = $("chatMessages");
  const card = document.createElement("div");
  card.className = "agent-progress";

  const title = document.createElement("strong");
  title.className = "agent-progress-title";
  title.textContent = "TA27A — تعاون الوكلاء الذكي";

  const stages = [
    { id: "document", name: "Document Agent", description: "قراءة المستند واستخراج الأدلة" },
    { id: "analysis", name: "Analysis Agent", description: "تحليل المعلومات والنتائج" },
    { id: "verification", name: "Verification Agent", description: "مراجعة النتائج والتحقق منها" },
    { id: "answer", name: "Answer Agent", description: "صياغة الإجابة النهائية" }
  ];

  const rows = {};

  card.appendChild(title);

  stages.forEach((stage) => {
    const row = document.createElement("div");
    row.className = "agent-step";
    row.dataset.stage = stage.id;

    const info = document.createElement("div");
    info.className = "agent-step-info";

    const name = document.createElement("strong");
    name.textContent = stage.name;

    const description = document.createElement("small");
    description.textContent = stage.description;

    const status = document.createElement("span");
    status.className = "agent-step-status";
    status.textContent = "بانتظار البدء";

    info.append(name, description);
    row.append(info, status);
    card.appendChild(row);

    rows[stage.id] = { row, status };
  });

  container.appendChild(card);
  container.scrollTop = container.scrollHeight;

  return {
    setRunning(id) {
      const item = rows[id];
      item.row.classList.remove("completed", "failed");
      item.row.classList.add("running");
      item.status.textContent = "جاري العمل...";
      container.scrollTop = container.scrollHeight;
    },

    setCompleted(id) {
      const item = rows[id];
      item.row.classList.remove("running", "failed");
      item.row.classList.add("completed");
      item.status.textContent = "اكتمل ✓";
      container.scrollTop = container.scrollHeight;
    },

    setFailed(id) {
      const item = rows[id];
      item.row.classList.remove("running", "completed");
      item.row.classList.add("failed");
      item.status.textContent = "تعذر إكمال المرحلة";
      container.scrollTop = container.scrollHeight;
    }
  };
}

async function askQuestion(question) {
  if (!currentConversationId || !currentDocumentText) {
    showToast("ارفع ملف PDF أولاً.");
    return;
  }

  const sendButton = $("sendQuestion");
  sendButton.disabled = true;

  addMessage("user", question);
  $("questionInput").value = "";

  const progress = createAgentProgress();
  let activeStage = null;

  const runAgent = async (stage, context = {}) => {
    activeStage = stage;
    progress.setRunning(stage);

    const result = await apiRequest("chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage,
        prompt: question,
        documentText: currentDocumentText,
        context
      })
    });

    if (!result.success || !result.text) {
      throw new Error(result.error || `${stage} failed.`);
    }

    progress.setCompleted(stage);
    activeStage = null;
    return result.text;
  };

  try {
    await saveMessage("user", question);

    const evidence = await runAgent("document");

    const analysis = await runAgent("analysis", {
      evidence
    });

    const verification = await runAgent("verification", {
      evidence,
      analysis
    });

    const answer = await runAgent("answer", {
      verification
    });

    addMessage("assistant", answer);
    await saveMessage("assistant", answer);
    await loadConversations();

  } catch (error) {
    if (activeStage) {
      progress.setFailed(activeStage);
    }

    addMessage(
      "assistant",
      `تعذر إكمال التحليل: ${error.message || "حدث خطأ غير متوقع."}\nيمكنك المحاولة مرة أخرى.`
    );
  } finally {
    sendButton.disabled = false;
    $("questionInput").focus();
  }
}
async function openConversation(id) {
  try {
    const result = await apiRequest(`conversation?id=${encodeURIComponent(id)}`);

    currentConversationId = result.conversation.id;
    currentDocumentText = result.conversation.document_text || "";
    currentFileName = result.conversation.file_name || "";

    $("documentName").textContent = currentFileName;
    $("documentStatus").textContent = "محادثة محفوظة";
    $("welcomePanel").classList.add("hidden");
    $("documentPanel").classList.remove("hidden");
    $("chatMessages").replaceChildren();

    (result.messages || []).forEach((message) => {
      addMessage(message.role, message.content);
    });

    renderConversations();
    closeSidebar();
  } catch (error) {
    showToast(error.message);
  }
}

function closeSidebar() {
  $("sidebar").classList.remove("open");
}

$("loginTab").addEventListener("click", () => setAuthMode("login"));
$("signupTab").addEventListener("click", () => setAuthMode("signup"));

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("email").value.trim();
  const password = $("password").value;
  const button = $("authSubmit");

  button.disabled = true;
  showMessage($("authMessage"), "يرجى الانتظار...");

  try {
    if (authMode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      if (data.session) {
        currentUser = data.user;
        await enterApp();
      } else {
        showMessage(
          $("authMessage"),
          "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد التسجيل.",
          "success"
        );
      }
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      currentUser = data.user;
      await enterApp();
    }
  } catch (error) {
    showMessage($("authMessage"), error.message, "error");
  } finally {
    button.disabled = false;
  }
});

$("logoutButton").addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) showToast(error.message);
  else {
    currentUser = null;
    resetWorkspace();
    showScreen("auth");
  }
});

$("newConversation").addEventListener("click", () => {
  resetWorkspace();
  closeSidebar();
});

$("changeFile").addEventListener("click", resetWorkspace);

$("pdfInput").addEventListener("change", (event) => {
  uploadPDF(event.target.files[0]);
});

$("questionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const question = $("questionInput").value.trim();
  if (question) askQuestion(question);
});

$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  $("themeToggle").textContent = isLight ? "🌙 الوضع الليلي" : "☀️ الوضع النهاري";
  localStorage.setItem("ta27a-theme", isLight ? "light" : "dark");
});

$("openSidebar").addEventListener("click", () => {
  $("sidebar").classList.add("open");
});

$("closeSidebar").addEventListener("click", closeSidebar);

const savedTheme = localStorage.getItem("ta27a-theme");
if (savedTheme === "light") {
  document.body.classList.add("light");
  $("themeToggle").textContent = "🌙 الوضع الليلي";
}

const dropZone = $("dropZone");

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  uploadPDF(event.dataTransfer.files[0]);
});

initialize();

