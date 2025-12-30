const STORAGE_KEYS = {
  users: "nyx-users",
  session: "nyx-session",
  settings: "nyx-settings",
};

const defaultSettings = {
  downloadsEnabled: true,
  maintenanceMode: false,
  broadcast: "Welcome to Nyx Matrix Lab. Secure channel online.",
};

const demoSequence = [
  "nyx@lab:~$ deploy --stealth",
  "> assembling build matrix...",
  "> compressing payload...",
  "> verifying checksums...",
  "> release signed + queued.",
  "nyx@lab:~$ unlock demo",
  "> demo environment online.",
];

const elements = {
  loginModal: document.getElementById("login-modal"),
  registerModal: document.getElementById("register-modal"),
  messageModal: document.getElementById("message-modal"),
  messageTitle: document.getElementById("message-title"),
  messageBody: document.getElementById("message-body"),
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  authActions: document.getElementById("auth-actions"),
  userActions: document.getElementById("user-actions"),
  userPill: document.getElementById("user-pill"),
  logout: document.getElementById("logout"),
  downloadButton: document.getElementById("download-button"),
  downloadStatus: document.getElementById("download-status"),
  toggleDownloads: document.getElementById("toggle-downloads"),
  toggleMaintenance: document.getElementById("toggle-maintenance"),
  broadcastInput: document.getElementById("broadcast-message"),
  broadcastDisplay: document.getElementById("broadcast-display"),
  saveBroadcast: document.getElementById("save-broadcast"),
  resetUsers: document.getElementById("reset-users"),
  userList: document.getElementById("user-list"),
  demoOutput: document.getElementById("demo-output"),
  runDemo: document.getElementById("run-demo"),
  resetDemo: document.getElementById("reset-demo"),
};

const openModalButtons = document.querySelectorAll("[data-open]");
const closeModalButtons = document.querySelectorAll("[data-close]");

const getStorage = (key, fallback) => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
};

const setStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const seedAdmin = () => {
  const users = getStorage(STORAGE_KEYS.users, []);
  const hasAdmin = users.some((user) => user.username === "admin");
  if (!hasAdmin) {
    users.push({
      username: "admin",
      email: "admin@nyx.lab",
      password: "matrix",
      role: "admin",
      createdAt: new Date().toISOString(),
    });
    setStorage(STORAGE_KEYS.users, users);
  }
};

const ensureSettings = () => {
  const current = getStorage(STORAGE_KEYS.settings, null);
  if (!current) {
    setStorage(STORAGE_KEYS.settings, defaultSettings);
  }
};

const showModal = (modal) => {
  modal.classList.add("show");
};

const closeModal = (modal) => {
  modal.classList.remove("show");
};

const showMessage = (title, body) => {
  elements.messageTitle.textContent = title;
  elements.messageBody.textContent = body;
  showModal(elements.messageModal);
};

const setSession = (user) => {
  setStorage(STORAGE_KEYS.session, user);
};

const getSession = () => getStorage(STORAGE_KEYS.session, null);

const clearSession = () => {
  localStorage.removeItem(STORAGE_KEYS.session);
};

const updateAuthUI = () => {
  const session = getSession();
  if (session) {
    elements.authActions.classList.add("hidden");
    elements.userActions.classList.remove("hidden");
    elements.userPill.textContent = `${session.username} • ${session.role}`;
  } else {
    elements.authActions.classList.remove("hidden");
    elements.userActions.classList.add("hidden");
    elements.userPill.textContent = "";
  }
  updateDownloadState();
  updateAdminPanel();
};

const updateDownloadState = () => {
  const session = getSession();
  const settings = getStorage(STORAGE_KEYS.settings, defaultSettings);
  if (!session) {
    elements.downloadStatus.textContent =
      "Authenticate to unlock the download vault.";
    elements.downloadButton.classList.add("ghost");
    elements.downloadButton.classList.remove("primary");
    elements.downloadButton.setAttribute("aria-disabled", "true");
    elements.downloadButton.href = "#";
    return;
  }

  if (settings.maintenanceMode) {
    elements.downloadStatus.textContent =
      "Maintenance mode active. Downloads are locked.";
    elements.downloadButton.classList.add("ghost");
    elements.downloadButton.classList.remove("primary");
    elements.downloadButton.setAttribute("aria-disabled", "true");
    elements.downloadButton.href = "#";
    return;
  }

  if (!settings.downloadsEnabled) {
    elements.downloadStatus.textContent =
      "Downloads disabled by admin. Check back soon.";
    elements.downloadButton.classList.add("ghost");
    elements.downloadButton.classList.remove("primary");
    elements.downloadButton.setAttribute("aria-disabled", "true");
    elements.downloadButton.href = "#";
    return;
  }

  elements.downloadStatus.textContent =
    "Authenticated. Download ready. Audit logging enabled.";
  elements.downloadButton.classList.add("primary");
  elements.downloadButton.classList.remove("ghost");
  elements.downloadButton.removeAttribute("aria-disabled");
  elements.downloadButton.href = "downloads/project-source.zip";
};

const updateAdminPanel = () => {
  const session = getSession();
  const settings = getStorage(STORAGE_KEYS.settings, defaultSettings);
  const users = getStorage(STORAGE_KEYS.users, []);

  if (session?.role !== "admin") {
    elements.toggleDownloads.setAttribute("disabled", "true");
    elements.toggleMaintenance.setAttribute("disabled", "true");
    elements.broadcastInput.setAttribute("disabled", "true");
    elements.saveBroadcast.setAttribute("disabled", "true");
    elements.resetUsers.setAttribute("disabled", "true");
  } else {
    elements.toggleDownloads.removeAttribute("disabled");
    elements.toggleMaintenance.removeAttribute("disabled");
    elements.broadcastInput.removeAttribute("disabled");
    elements.saveBroadcast.removeAttribute("disabled");
    elements.resetUsers.removeAttribute("disabled");
  }

  elements.toggleDownloads.checked = settings.downloadsEnabled;
  elements.toggleMaintenance.checked = settings.maintenanceMode;
  elements.broadcastInput.value = settings.broadcast;
  elements.broadcastDisplay.textContent = settings.broadcast;

  elements.userList.innerHTML = "";
  users.forEach((user) => {
    const row = document.createElement("div");
    row.textContent = `${user.username} • ${user.role}`;
    elements.userList.appendChild(row);
  });
};

const registerUser = ({ username, email, password }) => {
  const users = getStorage(STORAGE_KEYS.users, []);
  const exists = users.some((user) => user.username === username);
  if (exists) {
    showMessage("Registration blocked", "Username already exists.");
    return;
  }
  users.push({
    username,
    email,
    password,
    role: "user",
    createdAt: new Date().toISOString(),
  });
  setStorage(STORAGE_KEYS.users, users);
  showMessage("Access granted", "Account created. Login to proceed.");
};

const authenticate = ({ username, password }) => {
  const users = getStorage(STORAGE_KEYS.users, []);
  const user = users.find(
    (item) => item.username === username && item.password === password
  );
  if (!user) {
    showMessage("Access denied", "Invalid credentials.");
    return;
  }
  setSession({ username: user.username, role: user.role });
  closeModal(elements.loginModal);
  updateAuthUI();
};

openModalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.open;
    if (target === "login") {
      showModal(elements.loginModal);
    }
    if (target === "register") {
      showModal(elements.registerModal);
    }
  });
});

closeModalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    closeModal(button.closest(".modal"));
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal.show").forEach(closeModal);
  }
});

elements.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  authenticate({
    username: formData.get("username").trim(),
    password: formData.get("password").trim(),
  });
});

elements.registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  registerUser({
    username: formData.get("username").trim(),
    email: formData.get("email").trim(),
    password: formData.get("password").trim(),
  });
  closeModal(elements.registerModal);
});

elements.logout.addEventListener("click", () => {
  clearSession();
  updateAuthUI();
});

elements.toggleDownloads.addEventListener("change", (event) => {
  const session = getSession();
  if (session?.role !== "admin") {
    showMessage("Restricted", "Admin access required.");
    event.target.checked = !event.target.checked;
    return;
  }
  const settings = getStorage(STORAGE_KEYS.settings, defaultSettings);
  settings.downloadsEnabled = event.target.checked;
  setStorage(STORAGE_KEYS.settings, settings);
  updateDownloadState();
});

elements.toggleMaintenance.addEventListener("change", (event) => {
  const session = getSession();
  if (session?.role !== "admin") {
    showMessage("Restricted", "Admin access required.");
    event.target.checked = !event.target.checked;
    return;
  }
  const settings = getStorage(STORAGE_KEYS.settings, defaultSettings);
  settings.maintenanceMode = event.target.checked;
  setStorage(STORAGE_KEYS.settings, settings);
  updateDownloadState();
});

elements.saveBroadcast.addEventListener("click", () => {
  const session = getSession();
  if (session?.role !== "admin") {
    showMessage("Restricted", "Admin access required.");
    return;
  }
  const settings = getStorage(STORAGE_KEYS.settings, defaultSettings);
  settings.broadcast = elements.broadcastInput.value.trim();
  setStorage(STORAGE_KEYS.settings, settings);
  updateAdminPanel();
  showMessage("Broadcast saved", "Message deployed to footer feed.");
});

elements.resetUsers.addEventListener("click", () => {
  const session = getSession();
  if (session?.role !== "admin") {
    showMessage("Restricted", "Admin access required.");
    return;
  }
  setStorage(STORAGE_KEYS.users, []);
  seedAdmin();
  showMessage("Registry reset", "User list cleared and admin restored.");
  updateAdminPanel();
});

const runDemoSequence = async () => {
  elements.runDemo.setAttribute("disabled", "true");
  for (const line of demoSequence) {
    const entry = document.createElement("p");
    entry.textContent = line;
    elements.demoOutput.appendChild(entry);
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  elements.runDemo.removeAttribute("disabled");
};

elements.runDemo.addEventListener("click", runDemoSequence);

elements.resetDemo.addEventListener("click", () => {
  elements.demoOutput.innerHTML =
    "<p>nyx@lab:~$ status</p><p>&gt; scanning modules...</p><p>&gt; tracing pipelines...</p><p>&gt; all systems stable.</p>";
});

seedAdmin();
ensureSettings();
updateAuthUI();
updateAdminPanel();
updateDownloadState();
