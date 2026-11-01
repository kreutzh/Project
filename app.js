const STORAGE_KEY = "ruangKuliahData";
const toast = document.querySelector("#toast");
const dialog = document.querySelector("#editor-dialog");
const editorForm = document.querySelector("#editor-form");
const dialogFields = document.querySelector("#dialog-fields");
const dialogTitle = document.querySelector("#dialog-title");
const deleteButton = document.querySelector("#dialog-delete");
const searchInput = document.querySelector("#search-input");
const noteGrid = document.querySelector("#notes-grid");
const taskList = document.querySelector("#task-list");
const subjectList = document.querySelector("#subject-list");
let toastTimer;
let editor = { kind: "", id: null };
let view = "home";
let subjectFilter = "";

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

function emptyState() {
  return { notes: [], tasks: [], subjects: [], name: "", semester: "" };
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const value = JSON.parse(raw);
    if (!value || !Array.isArray(value.notes) || !Array.isArray(value.tasks) || !Array.isArray(value.subjects)) {
      throw new Error("Format data tidak sesuai.");
    }
    return {
      notes: value.notes,
      tasks: value.tasks,
      subjects: value.subjects,
      name: typeof value.name === "string" ? value.name : "",
      semester: typeof value.semester === "string" ? value.semester : "",
    };
  } catch (error) {
    showToast(`Data lokal tidak dapat dibaca: ${error.message}`);
    return emptyState();
  }
}

let state = loadState();

function saveState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    showToast(`Data berubah di halaman ini tetapi gagal disimpan: ${error.message}`);
    return false;
  }
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeButton(className, text, label) {
  const button = makeElement("button", className, text);
  button.type = "button";
  if (label) button.setAttribute("aria-label", label);
  return button;
}

function createId() {
  return window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createField(labelText, name, type, value, required = false) {
  const label = makeElement("label", "form-field");
  label.append(makeElement("span", "", labelText));
  const control = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
  control.name = name;
  control.type = type === "textarea" ? "text" : type;
  if (type === "textarea") {
    control.rows = 6;
    control.value = value || "";
  } else {
    control.value = value || "";
  }
  control.required = required;
  label.append(control);
  return label;
}

function createSubjectSelect(value) {
  const label = makeElement("label", "form-field");
  label.append(makeElement("span", "", "Mata kuliah"));
  const select = document.createElement("select");
  select.name = "subject";
  const noSubject = new Option("Tanpa mata kuliah", "");
  select.add(noSubject);
  state.subjects.forEach((subject) => select.add(new Option(subject.name, subject.id)));
  select.value = value || "";
  label.append(select);
  return label;
}

function requireNonBlank(fieldName, message) {
  const field = editorForm.elements[fieldName];
  if (field.value.trim()) return true;
  field.setCustomValidity(message);
  field.reportValidity();
  field.addEventListener("input", () => field.setCustomValidity(""), { once: true });
  return false;
}

function subjectName(id) {
  return state.subjects.find((subject) => subject.id === id)?.name || "";
}

function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "Tanpa tenggat";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";
  return new Intl.DateTimeFormat("id-ID", options).format(date);
}

function renderProfile() {
  const name = state.name.trim();
  document.querySelector("#profile-name").textContent = name || "Atur profil";
  document.querySelector("#profile-avatar").textContent = name
    ? name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("id")
    : "?";
  const wave = makeElement("span", "wave", "✳");
  wave.setAttribute("aria-hidden", "true");
  document.querySelector("#welcome-title").replaceChildren(
    document.createTextNode(name ? `Halo, ${name} ` : "Selamat datang "),
    wave,
  );
  document.querySelector("#semester-name").textContent = state.semester || "Atur semester";
}

function renderSubjects() {
  subjectList.replaceChildren();
  const allSubjects = makeButton("nav-item subject-item", "Semua mata kuliah");
  allSubjects.dataset.subject = "";
  const allDot = makeElement("span", "subject-dot dot-lilac");
  allDot.setAttribute("aria-hidden", "true");
  allSubjects.prepend(allDot);
  subjectList.append(allSubjects);

  state.subjects.forEach((subject, index) => {
    const row = makeElement("div", "subject-row");
    const filterButton = makeButton("nav-item subject-item", subject.name);
    filterButton.dataset.subject = subject.id;
    const dot = makeElement("span", `subject-dot dot-${["blue", "orange", "green", "pink", "lilac"][index % 5]}`);
    dot.setAttribute("aria-hidden", "true");
    filterButton.prepend(dot);
    const optionsButton = makeButton("subject-options", "···", `Kelola mata kuliah ${subject.name}`);
    optionsButton.dataset.subjectEdit = subject.id;
    row.append(filterButton, optionsButton);
    subjectList.append(row);
  });
  setActiveNav();
}

function setActiveNav() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  subjectList.querySelectorAll("[data-subject]").forEach((button) => {
    button.classList.toggle("active", view === "notes" && button.dataset.subject === subjectFilter);
  });
}

function openView(nextView, scroll = true) {
  view = nextView;
  document.querySelector("#task-section").hidden = view === "notes";
  document.querySelector("#notes-section").hidden = view === "tasks";
  setActiveNav();
  render();
  if (scroll) {
    if (view === "tasks") document.querySelector("#task-section").scrollIntoView({ behavior: "smooth", block: "start" });
    else if (view === "notes") document.querySelector("#notes-section").scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function renderNotes() {
  const query = searchInput.value.trim().toLocaleLowerCase("id");
  const matching = state.notes
    .filter((note) => !subjectFilter || note.subjectId === subjectFilter)
    .filter((note) => `${note.title} ${note.content} ${subjectName(note.subjectId)}`.toLocaleLowerCase("id").includes(query))
    .sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
  const notes = view === "home" ? matching.slice(0, 3) : matching;
  noteGrid.replaceChildren();

  notes.forEach((note, index) => {
    const card = makeElement("article", `note-card note-${["lilac", "peach", "mint"][index % 3]}`);
    card.tabIndex = 0;
    card.dataset.noteId = note.id;
    const top = makeElement("div", "note-card-top");
    const category = makeElement("span", "note-category");
    category.append(makeElement("i", `mini-dot dot-${["blue", "orange", "green", "pink", "lilac"][Math.max(0, state.subjects.findIndex((subject) => subject.id === note.subjectId)) % 5]}`));
    category.append(document.createTextNode(subjectName(note.subjectId) || "TANPA MATA KULIAH"));
    top.append(category, makeButton("card-menu", "···", "Opsi catatan"));
    const title = makeElement("h3", "", note.title);
    const content = makeElement("p", "", note.content);
    const footer = makeElement("div", "note-card-footer");
    footer.append(makeElement("span", "", formatDate(note.updatedAt || note.createdAt)));
    footer.append(makeElement("span", "note-type", "Catatan"));
    card.append(top, title, content, footer);
    noteGrid.append(card);
  });

  const empty = document.querySelector("#note-empty");
  const noMatches = matching.length === 0 && Boolean(query || subjectFilter);
  document.querySelector("#note-empty-message").textContent = noMatches
    ? "Tidak ada catatan yang cocok."
    : "Belum ada catatan. Tambahkan catatan pertamamu.";
  empty.hidden = notes.length > 0;
  document.querySelector("#note-count").textContent = String(state.notes.length);
}

function renderTasks() {
  const pending = state.tasks.filter((task) => !task.completed);
  const ordered = [...state.tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
  const tasks = view === "home" ? ordered.filter((task) => !task.completed).slice(0, 3) : ordered;
  taskList.replaceChildren();

  tasks.forEach((task) => {
    const row = makeElement("article", `task-row${task.completed ? " completed" : ""}`);
    row.dataset.taskId = task.id;
    row.tabIndex = 0;
    row.setAttribute("aria-label", `Tugas ${task.title}. Tekan Enter untuk mengedit.`);
    const check = makeButton("check-button", "", task.completed ? "Tandai tugas belum selesai" : "Tandai tugas selesai");
    check.dataset.taskToggle = task.id;
    check.setAttribute("aria-pressed", String(task.completed));
    const copy = makeElement("div", "task-copy");
    copy.append(makeElement("strong", "", task.title));
    const subject = makeElement("span");
    if (subjectName(task.subjectId)) {
      subject.append(makeElement("i", `mini-dot dot-${["blue", "orange", "green", "pink", "lilac"][Math.max(0, state.subjects.findIndex((item) => item.id === task.subjectId)) % 5]}`));
      subject.append(document.createTextNode(subjectName(task.subjectId)));
    } else {
      subject.textContent = "Tanpa mata kuliah";
    }
    copy.append(subject);
    row.append(check, copy, makeElement("time", "due-date", formatDate(task.dueDate, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })));
    const options = makeButton("row-more", "···", "Opsi tugas");
    options.dataset.taskEdit = task.id;
    row.append(options);
    taskList.append(row);
  });
  document.querySelector("#task-empty").hidden = tasks.length > 0;
  document.querySelector("#task-heading-count").textContent = String(pending.length);
  document.querySelectorAll(".task-count").forEach((element) => element.textContent = String(pending.length));
}

function render() {
  document.querySelector("#current-view").textContent = view === "tasks"
    ? "Daftar tugas"
    : view === "notes" && subjectFilter
      ? subjectName(subjectFilter) || "Semua catatan"
      : view === "notes"
        ? "Semua catatan"
        : "Beranda";
  document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date()).toLocaleUpperCase("id");
  renderProfile();
  renderSubjects();
  renderTasks();
  renderNotes();
}

function addSubjectField(selectedId = "") {
  const label = makeElement("label", "form-field");
  label.append(makeElement("span", "", "Mata kuliah"));
  const select = document.createElement("select");
  select.name = "subject";
  select.add(new Option("Tanpa mata kuliah", ""));
  state.subjects.forEach((subject) => select.add(new Option(subject.name, subject.id)));
  select.value = selectedId || "";
  label.append(select);
  dialogFields.append(label);
}

function openEditor(kind, id = null) {
  editor = { kind, id };
  const record = kind === "note"
    ? state.notes.find((item) => item.id === id)
    : kind === "task"
      ? state.tasks.find((item) => item.id === id)
      : kind === "subject"
        ? state.subjects.find((item) => item.id === id)
        : null;
  dialogFields.replaceChildren();
  deleteButton.hidden = !record;

  if (kind === "note") {
    dialogTitle.textContent = record ? "Edit catatan" : "Catatan baru";
    dialogFields.append(createField("Judul", "title", "text", record?.title, true));
    dialogFields.append(createField("Isi catatan", "content", "textarea", record?.content, true));
    addSubjectField(record?.subjectId);
  } else if (kind === "task") {
    dialogTitle.textContent = record ? "Edit tugas" : "Tugas baru";
    dialogFields.append(createField("Nama tugas", "title", "text", record?.title, true));
    dialogFields.append(createField("Tenggat", "dueDate", "datetime-local", record?.dueDate, false));
    addSubjectField(record?.subjectId);
  } else if (kind === "subject") {
    dialogTitle.textContent = record ? "Edit mata kuliah" : "Mata kuliah baru";
    dialogFields.append(createField("Nama mata kuliah", "name", "text", record?.name, true));
  } else {
    dialogTitle.textContent = "Pengaturan profil";
    dialogFields.append(createField("Nama", "name", "text", state.name));
    dialogFields.append(createField("Semester", "semester", "text", state.semester));
  }
  dialog.showModal();
  dialogFields.querySelector("input, textarea, select")?.focus();
}

function removeRecord() {
  if (!editor.id || !window.confirm("Hapus item ini? Tindakan ini tidak bisa dibatalkan.")) return;
  if (editor.kind === "note") state.notes = state.notes.filter((item) => item.id !== editor.id);
  if (editor.kind === "task") state.tasks = state.tasks.filter((item) => item.id !== editor.id);
  if (editor.kind === "subject") {
    state.subjects = state.subjects.filter((item) => item.id !== editor.id);
    state.notes.forEach((item) => { if (item.subjectId === editor.id) item.subjectId = ""; });
    state.tasks.forEach((item) => { if (item.subjectId === editor.id) item.subjectId = ""; });
    if (subjectFilter === editor.id) subjectFilter = "";
  }
  const saved = saveState();
  dialog.close();
  render();
  if (saved) showToast("Item dihapus.");
}

editorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(editorForm));
  const now = new Date().toISOString();
  const current = editor.kind === "note"
    ? state.notes.find((item) => item.id === editor.id)
    : editor.kind === "task"
      ? state.tasks.find((item) => item.id === editor.id)
      : editor.kind === "subject"
        ? state.subjects.find((item) => item.id === editor.id)
        : null;

  if (editor.kind === "note") {
    if (!requireNonBlank("title", "Judul catatan wajib diisi.") || !requireNonBlank("content", "Isi catatan wajib diisi.")) return;
    const note = { id: current?.id || createId(), title: values.title.trim(), content: values.content.trim(), subjectId: values.subject, createdAt: current?.createdAt || now, updatedAt: now };
    if (current) Object.assign(current, note);
    else state.notes.push(note);
  } else if (editor.kind === "task") {
    if (!requireNonBlank("title", "Nama tugas wajib diisi.")) return;
    const task = { id: current?.id || createId(), title: values.title.trim(), dueDate: values.dueDate, subjectId: values.subject, completed: current?.completed || false, createdAt: current?.createdAt || now };
    if (current) Object.assign(current, task);
    else state.tasks.push(task);
  } else if (editor.kind === "subject") {
    if (!requireNonBlank("name", "Nama mata kuliah wajib diisi.")) return;
    const name = values.name.trim();
    const duplicate = state.subjects.some((subject) => subject.name.toLocaleLowerCase("id") === name.toLocaleLowerCase("id") && subject.id !== editor.id);
    if (duplicate) {
      editorForm.elements.name.setCustomValidity("Mata kuliah tersebut sudah ada.");
      editorForm.elements.name.reportValidity();
      editorForm.elements.name.addEventListener("input", () => editorForm.elements.name.setCustomValidity(""), { once: true });
      return;
    }
    if (current) {
      current.name = name;
      [...state.notes, ...state.tasks].forEach((item) => {
        if (item.subjectId === current.id) item.subjectName = name;
      });
    } else {
      state.subjects.push({ id: createId(), name });
    }
  } else {
    state.name = values.name.trim();
    state.semester = values.semester.trim();
  }

  const saved = saveState();
  dialog.close();
  render();
  if (saved) showToast("Perubahan disimpan di browser ini.");
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    subjectFilter = "";
    searchInput.value = "";
    openView(button.dataset.view);
  });
});

document.querySelectorAll("[data-view-link]").forEach((button) => {
  button.addEventListener("click", () => {
    subjectFilter = "";
    searchInput.value = "";
    openView(button.dataset.viewLink);
  });
});

document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  subjectFilter = "";
  searchInput.value = "";
  openView("home");
});

document.querySelector("#new-note-button").addEventListener("click", () => openEditor("note"));
document.querySelector("#new-task-button").addEventListener("click", () => openEditor("task"));
document.querySelector("#add-subject").addEventListener("click", () => openEditor("subject"));
document.querySelector("#profile-button").addEventListener("click", () => openEditor("profile"));
document.querySelector("#semester-name").closest(".semester-card").addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  openEditor("profile");
});
document.querySelector(".more-button").addEventListener("click", () => openEditor("profile"));
document.querySelector("#dialog-close").addEventListener("click", () => dialog.close());
document.querySelector("#dialog-cancel").addEventListener("click", () => dialog.close());
deleteButton.addEventListener("click", removeRecord);

document.querySelector("#notification-button").addEventListener("click", () => {
  const count = state.tasks.filter((task) => !task.completed).length;
  showToast(count ? `Kamu punya ${count} tugas yang belum selesai.` : "Tidak ada tugas yang belum selesai.");
});

document.querySelector("#task-list").addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-task-toggle]");
  if (toggle) {
    const task = state.tasks.find((item) => item.id === toggle.dataset.taskToggle);
    if (!task) return;
    task.completed = !task.completed;
    saveState();
    render();
    return;
  }
  const editButton = event.target.closest("[data-task-edit]");
  if (editButton) openEditor("task", editButton.dataset.taskEdit);
  else {
    const row = event.target.closest("[data-task-id]");
    if (row) openEditor("task", row.dataset.taskId);
  }
});

document.querySelector("#task-list").addEventListener("keydown", (event) => {
  const row = event.target.closest("[data-task-id]");
  if (row && event.target === row && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openEditor("task", row.dataset.taskId);
  }
});

noteGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-note-id]");
  if (!card) return;
  openEditor("note", card.dataset.noteId);
});

noteGrid.addEventListener("keydown", (event) => {
  const card = event.target.closest("[data-note-id]");
  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openEditor("note", card.dataset.noteId);
  }
});

subjectList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-subject-edit]");
  if (editButton) {
    event.stopPropagation();
    openEditor("subject", editButton.dataset.subjectEdit);
    return;
  }
  const button = event.target.closest("[data-subject]");
  if (!button) return;
  subjectFilter = button.dataset.subject;
  searchInput.value = "";
  openView("notes");
});

searchInput.addEventListener("input", () => {
  subjectFilter = "";
  if (searchInput.value.trim()) view = "notes";
  openView(view, false);
});

document.querySelectorAll("[data-create]").forEach((button) => {
  button.addEventListener("click", () => openEditor(button.dataset.create));
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  try {
    state = event.newValue ? JSON.parse(event.newValue) : emptyState();
    render();
    showToast("Data diperbarui dari tab browser lain.");
  } catch (error) {
    showToast(`Data dari tab lain tidak dapat dibaca: ${error.message}`);
  }
});

render();
