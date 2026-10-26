const toast = document.querySelector("#toast");
const currentView = document.querySelector("#current-view");
const searchInput = document.querySelector("#search-input");
const noteCards = [...document.querySelectorAll("[data-note]")];
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

function setView(view) {
  currentView.textContent = view;
  document.querySelectorAll(".primary-nav .nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
  if (view === "Semua catatan") {
    document.querySelector(".notes-section").scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (view === "Daftar tugas") {
    document.querySelector(".task-section").scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

document.querySelectorAll("[data-view]").forEach((item) => {
  item.addEventListener("click", () => setView(item.dataset.view));
});

document.querySelectorAll("[data-view-link]").forEach((item) => {
  item.addEventListener("click", () => setView(item.dataset.viewLink));
});

document.querySelectorAll("[data-subject]").forEach((item) => {
  item.addEventListener("click", () => {
    const subject = item.dataset.subject;
    noteCards.forEach((card) => {
      card.hidden = subject !== "Semua" && card.dataset.subject !== subject;
    });
    setView(subject === "Semua" ? "Beranda" : subject);
    document.querySelector(".notes-section").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLocaleLowerCase("id");
  let visibleCount = 0;
  noteCards.forEach((card) => {
    const matches = card.textContent.toLocaleLowerCase("id").includes(query);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  document.querySelector("#empty-search").hidden = visibleCount > 0;
});

document.querySelectorAll("[data-task] .check-button").forEach((button) => {
  button.addEventListener("click", () => {
    const task = button.closest("[data-task]");
    task.classList.toggle("completed");
    button.setAttribute("aria-label", task.classList.contains("completed") ? "Tandai tugas belum selesai" : "Tandai tugas selesai");
  });
});

document.querySelector("#new-note-button").addEventListener("click", () => showToast("Form catatan akan tersedia setelah fitur penyimpanan dibuat."));
document.querySelector("#new-task-button").addEventListener("click", () => showToast("Form tugas akan tersedia setelah fitur penyimpanan dibuat."));
document.querySelector("#add-subject").addEventListener("click", () => showToast("Pengaturan mata kuliah akan tersedia nanti."));

document.querySelectorAll(".note-card").forEach((card) => {
  card.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    showToast("Detail catatan akan tersedia saat fitur catatan dibuat.");
  });
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
});
