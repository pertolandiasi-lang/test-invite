const targetDate = new Date("2028-12-15T17:00:00");
const foodOptions = ["Vegetarian", "Vegan", "Normal"];

const overlay = document.getElementById("invitation-overlay");
const site = document.getElementById("site");
const audioToggle = document.getElementById("audio-toggle");
const audio = document.getElementById("bg-music");
const form = document.getElementById("rsvp-form");
const formNote = document.getElementById("form-note");
const attendingInput = document.getElementById("attending");
const guestsInput = document.getElementById("guests");
const foodPreferences = document.getElementById("food-preferences");
const responsesList = document.getElementById("responses-list");
const downloadResponsesButton = document.getElementById("download-responses");
const clearResponsesButton = document.getElementById("clear-responses");

let audioEnabled = true;

function getStoredResponses() {
  try {
    return JSON.parse(localStorage.getItem("rsvp-responses") || "[]");
  } catch {
    return [];
  }
}

function saveStoredResponses(responses) {
  localStorage.setItem("rsvp-responses", JSON.stringify(responses));
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function updateCountdown() {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  const safe = Math.max(diff, 0);

  const days = Math.floor(safe / (1000 * 60 * 60 * 24));
  const hours = Math.floor((safe / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((safe / (1000 * 60)) % 60);
  const seconds = Math.floor((safe / 1000) % 60);

  document.getElementById("days").textContent = pad(days);
  document.getElementById("hours").textContent = pad(hours);
  document.getElementById("minutes").textContent = pad(minutes);
  document.getElementById("seconds").textContent = pad(seconds);
}

function setChoice(group, value) {
  group.querySelectorAll(".chip").forEach((button) => {
    button.classList.toggle("active", button.dataset.value === value);
  });
}

function renderFoodPreferences() {
  const totalGuests = Math.max(1, Math.min(5, Number.parseInt(guestsInput.value, 10) || 1));
  const previousValues = Array.from(
    foodPreferences.querySelectorAll("input[type='hidden']")
  ).map((input) => input.value);

  foodPreferences.innerHTML = "";

  for (let index = 0; index < totalGuests; index += 1) {
    const group = document.createElement("section");
    group.className = "food-group";

    const label = document.createElement("p");
    label.className = "food-label";
    label.textContent = totalGuests > 1 ? `Guest ${index + 1} Food Preference` : "Food Preference";
    group.appendChild(label);

    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = `food-${index + 1}`;
    hidden.value = previousValues[index] || "";
    group.appendChild(hidden);

    const row = document.createElement("div");
    row.className = "choice-row";

    foodOptions.forEach((option) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.value = option;
      chip.textContent = option;
      chip.addEventListener("click", () => {
        hidden.value = option;
        setChoice(row, option);
      });
      row.appendChild(chip);
    });

    group.appendChild(row);
    foodPreferences.appendChild(group);

    if (hidden.value) {
      setChoice(row, hidden.value);
    }
  }
}

function renderResponses() {
  const responses = getStoredResponses();
  responsesList.innerHTML = "";

  if (!responses.length) {
    responsesList.innerHTML = '<p class="empty-state">No RSVP responses yet.</p>';
    return;
  }

  responses
    .slice()
    .reverse()
    .forEach((response) => {
      const card = document.createElement("article");
      card.className = "response-card";

      const title = document.createElement("h3");
      title.textContent = response.name || "Unnamed guest";
      card.appendChild(title);

      const meta = document.createElement("p");
      meta.className = "response-meta";
      meta.textContent = `${response.attending} • ${response.email} • ${response.guests} guest(s)`;
      card.appendChild(meta);

      const food = document.createElement("p");
      food.className = "response-list-line";
      food.innerHTML = `<strong>Food:</strong> ${response.foodPreferences.filter(Boolean).join(", ") || "Not selected"}`;
      card.appendChild(food);

      const message = document.createElement("p");
      message.className = "response-copy";
      message.innerHTML = `<strong>Message:</strong> ${response.message || "No message left."}`;
      card.appendChild(message);

      const date = document.createElement("p");
      date.className = "response-list-line";
      date.innerHTML = `<strong>Submitted:</strong> ${new Date(response.submittedAt).toLocaleString()}`;
      card.appendChild(date);

      responsesList.appendChild(card);
    });
}

function openInvitation() {
  overlay.classList.add("is-opening");
  setTimeout(() => {
    overlay.remove();
    site.classList.remove("hidden");
    audioToggle.classList.remove("hidden");
  }, 700);

  audio.volume = 0.3;
  audio.play().catch(() => {
    audioEnabled = false;
    audioToggle.textContent = "♫";
    audioToggle.setAttribute("aria-label", "Unmute music");
  });
}

overlay.addEventListener("click", openInvitation);

document.querySelectorAll("[data-choice='attending'] .chip").forEach((button) => {
  button.addEventListener("click", () => {
    attendingInput.value = button.dataset.value;
    setChoice(button.parentElement, button.dataset.value);
  });
});

guestsInput.addEventListener("input", renderFoodPreferences);

audioToggle.addEventListener("click", () => {
  if (audio.paused) {
    audio.volume = 0.3;
    audio.play().catch(() => {});
    audioEnabled = true;
  } else if (audioEnabled) {
    audio.volume = 0;
    audioEnabled = false;
  } else {
    audio.volume = 0.3;
    audioEnabled = true;
  }

  audioToggle.textContent = audioEnabled ? "♪" : "♫";
  audioToggle.setAttribute("aria-label", audioEnabled ? "Mute music" : "Unmute music");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!attendingInput.value) {
    formNote.textContent = "Choose whether you are accepting or declining first.";
    formNote.className = "form-note";
    return;
  }

  const payload = {
    name: document.getElementById("full-name").value.trim(),
    email: document.getElementById("email").value.trim(),
    guests: Math.max(1, Math.min(5, Number.parseInt(guestsInput.value, 10) || 1)),
    attending: attendingInput.value,
    message: document.getElementById("message").value.trim(),
    foodPreferences: Array.from(foodPreferences.querySelectorAll("input[type='hidden']")).map(
      (input) => input.value || ""
    ),
    submittedAt: new Date().toISOString(),
  };

  const responses = getStoredResponses();
  responses.push(payload);
  saveStoredResponses(responses);
  localStorage.setItem("latest-rsvp", JSON.stringify(payload));
  form.reset();
  attendingInput.value = "";
  document.querySelectorAll(".chip.active").forEach((chip) => chip.classList.remove("active"));
  guestsInput.value = "1";
  renderFoodPreferences();
  renderResponses();
  formNote.textContent = "Thank you! Your RSVP has been saved locally in this browser.";
  formNote.className = "form-note success";
});

downloadResponsesButton.addEventListener("click", () => {
  const responses = getStoredResponses();
  const blob = new Blob([JSON.stringify(responses, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "rsvp-responses.json";
  link.click();
  URL.revokeObjectURL(url);
});

clearResponsesButton.addEventListener("click", () => {
  localStorage.removeItem("rsvp-responses");
  localStorage.removeItem("latest-rsvp");
  renderResponses();
  formNote.textContent = "Saved responses were cleared from this browser.";
  formNote.className = "form-note";
});

renderFoodPreferences();
renderResponses();
updateCountdown();
setInterval(updateCountdown, 1000);
