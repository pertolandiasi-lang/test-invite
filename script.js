const targetDate = new Date("2028-12-15T17:00:00");
const foodOptions = ["Vegetarian", "Vegan", "Normal"];
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby25N-qKRNayg_8Z1m431SvOO7TuXgS9IALivSUkX23fdc2TgQaUkFpUc9qoWNWlLCI/exec";

const overlay = document.getElementById("invitation-overlay");
const site = document.getElementById("site");
const audioToggle = document.getElementById("audio-toggle");
const audio = document.getElementById("bg-music");
const form = document.getElementById("rsvp-form");
const formNote = document.getElementById("form-note");
const attendingInput = document.getElementById("attending");
const guestsInput = document.getElementById("guests");
const foodPreferences = document.getElementById("food-preferences");
const messageInput = document.getElementById("message");
const guestsFieldGroup = document.querySelector(".field-group");

let audioEnabled = true;

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

function updateAttendanceMode() {
  const isDeclining = attendingInput.value === "Regretfully Decline";

  if (isDeclining) {
    guestsInput.value = "0";
    guestsInput.disabled = true;
    messageInput.value = "";
    messageInput.disabled = true;
    guestsFieldGroup.style.display = "none";
    foodPreferences.innerHTML = "";
    foodPreferences.style.display = "none";
    return;
  }

  guestsInput.disabled = false;
  messageInput.disabled = false;
  guestsFieldGroup.style.display = "";
  foodPreferences.style.display = "";

  if (!guestsInput.value || Number.parseInt(guestsInput.value, 10) < 1) {
    guestsInput.value = "1";
  }

  renderFoodPreferences();
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
    updateAttendanceMode();
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
    guests:
      attendingInput.value === "Regretfully Decline"
        ? 0
        : Math.max(1, Math.min(5, Number.parseInt(guestsInput.value, 10) || 1)),
    attending: attendingInput.value,
    message:
      attendingInput.value === "Regretfully Decline"
        ? ""
        : document.getElementById("message").value.trim(),
    foodPreferences:
      attendingInput.value === "Regretfully Decline"
        ? []
        : Array.from(foodPreferences.querySelectorAll("input[type='hidden']")).map(
            (input) => input.value || ""
          ),
    submittedAt: new Date().toISOString(),
  };

  formNote.textContent = "Sending...";
  formNote.className = "form-note";

  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  })
    .then(() => {
      form.reset();
      attendingInput.value = "";
      document.querySelectorAll(".chip.active").forEach((chip) => {
        chip.classList.remove("active");
      });
      guestsInput.value = "1";
      updateAttendanceMode();
      formNote.textContent = "Thank you! Your RSVP has been sent.";
      formNote.className = "form-note success";
    })
    .catch((error) => {
      console.error(error);
      formNote.textContent = "Something went wrong while sending. Please try again.";
      formNote.className = "form-note";
    });
});

renderFoodPreferences();
updateAttendanceMode();
updateCountdown();
setInterval(updateCountdown, 1000);
