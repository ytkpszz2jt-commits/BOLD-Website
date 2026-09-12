/**
 * BOLD Consultation — multi-step form logic.
 *
 * PREVIEW BUILD. Per the founder's explicit instruction, this page is not
 * yet wired to a live submission backend and must not be deployed to
 * production until the visual design is approved. When SUBMIT_ENDPOINT
 * below is set (after approval, alongside the Cloudflare Worker + D1
 * capture path documented in BOLD-AI's forms-questionnaire-intake.md),
 * the submit handler's TODO marks exactly where the real POST goes —
 * no other code needs to change. Until then, submitting shows the
 * approved completion message but does not send data anywhere, the
 * same "nothing invented" pattern used in js/config.js for the
 * existing enquiry form.
 */

const SUBMIT_ENDPOINT = ""; // set after design approval + backend build

// Exact approved question set — do not reword. Mirrors
// automations/artifacts/bold-consultation-quick-import.docx in BOLD-AI.
const STEPS = [
  { id: "name", q: "Your name", type: "text", name: "name", required: true },
  { id: "email", q: "Your email address", type: "email", name: "email", required: true },
  {
    id: "practice",
    q: "What is the name of your practice?",
    type: "text",
    name: "practiceName",
    required: true,
    extra: { name: "instagramOrWebsite", label: "Please also share your Instagram handle or website.", type: "text", required: true },
  },
  {
    id: "type",
    q: "Which best describes your practice?",
    type: "choice",
    name: "practiceType",
    required: true,
    options: ["Medspa", "Plastic Surgery Practice"],
  },
  {
    id: "locations",
    q: "How many locations does your practice currently operate?",
    type: "choice",
    name: "locationCount",
    required: true,
    options: ["One location", "Multiple locations"],
    conditional: { on: "Multiple locations", name: "numLocations", label: "How many locations do you currently operate?", type: "number", required: true },
  },
  {
    id: "established",
    q: "How long has your practice been established?",
    type: "choice",
    name: "established",
    required: true,
    options: ["Less than 1 year", "1 to 3 years", "3 to 5 years", "More than 5 years"],
  },
  {
    id: "marketingManaged",
    q: "How is your marketing currently managed?",
    type: "choice",
    name: "marketingManaged",
    required: true,
    options: [
      "We do not currently have a consistent marketing strategy",
      "Managed internally",
      "Managed by a freelancer",
      "Managed by another agency",
    ],
  },
  {
    id: "paidAds",
    q: "Are you currently investing in paid advertising?",
    type: "choice",
    name: "paidAds",
    required: true,
    options: ["Yes", "No"],
    conditional: { on: "Yes", name: "adSpend", label: "Approximately how much do you currently invest in paid advertising each month?", type: "text", required: true },
  },
  {
    id: "budget",
    q: "What is your current monthly marketing budget, excluding advertising spend?",
    type: "choice",
    name: "budget",
    required: true,
    options: ["Under $3,000", "$3,000 to $5,000", "$5,000 to $8,000", "$8,000+"],
  },
  {
    id: "challenge",
    q: "What is the primary marketing challenge your practice is facing right now?",
    type: "choice",
    name: "challenge",
    required: true,
    options: [
      "Generating consistent enquiries",
      "Converting enquiries into consultations or bookings",
      "Creating consistent, high quality content",
      "Finding the time or internal resources to manage marketing effectively",
      "Other",
    ],
    conditional: { on: "Other", name: "challengeOther", label: "Please tell us a little more.", type: "textarea", required: true },
  },
  {
    id: "goals",
    q: "What would you most like your marketing to achieve over the next three to six months?",
    type: "textarea",
    name: "goals",
    required: true,
  },
  {
    id: "timeline",
    q: "When are you looking to begin working with a marketing partner?",
    type: "choice",
    name: "timeline",
    required: true,
    options: ["Immediately", "Within the next month", "Currently exploring options"],
  },
  {
    id: "notes",
    q: "Is there anything else you would like us to know before your consultation?",
    type: "textarea",
    name: "notes",
    required: false,
  },
];

const stepsEl = document.getElementById("steps");
const form = document.getElementById("consult-form");
const btnBack = document.getElementById("btn-back");
const btnNext = document.getElementById("btn-next");
const btnSubmit = document.getElementById("btn-submit");
const statusEl = document.getElementById("form-status");
const progressFill = document.getElementById("progress-fill");
const progressLabel = document.getElementById("progress-label");
const successEl = document.getElementById("consult-success");
const submissionIdInput = document.getElementById("submission-id");

let current = 0;

function fieldMarkup(field, forStep) {
  const wrapId = `f-${field.name}`;
  if (field.type === "text" || field.type === "email" || field.type === "number") {
    return `
      <div class="field">
        <label for="${wrapId}">${field.label || forStep.q}</label>
        <input id="${wrapId}" name="${field.name}" type="${field.type}" ${field.required ? "required" : ""} autocomplete="${field.type === "email" ? "email" : "off"}" />
      </div>`;
  }
  if (field.type === "textarea") {
    return `
      <div class="field field--message">
        <label for="${wrapId}">${field.label || forStep.q}</label>
        <textarea id="${wrapId}" name="${field.name}" ${field.required ? "required" : ""}></textarea>
      </div>`;
  }
  return "";
}

function choiceMarkup(step) {
  const cards = step.options
    .map((opt, i) => {
      const id = `f-${step.name}-${i}`;
      return `
        <label class="choice-card">
          <input type="radio" name="${step.name}" id="${id}" value="${opt}" ${step.required ? "required" : ""} />
          <span class="choice-card__face"><span>${opt}</span><span class="choice-card__dot" aria-hidden="true"></span></span>
        </label>`;
    })
    .join("");
  return `<div class="choice-group" role="radiogroup">${cards}</div>`;
}

function renderStep(step, index) {
  const wrap = document.createElement("div");
  wrap.className = "step";
  wrap.dataset.index = String(index);
  wrap.id = `step-${step.id}`;

  let body = "";
  if (step.type === "choice") {
    body = choiceMarkup(step);
  } else {
    body = fieldMarkup({ name: step.name, type: step.type, required: step.required }, step);
  }

  let extraHtml = "";
  if (step.extra) {
    extraHtml = fieldMarkup(step.extra, step);
  }

  let conditionalHtml = "";
  if (step.conditional) {
    const c = step.conditional;
    conditionalHtml = `<div class="conditional-field" id="cond-${step.name}">${fieldMarkup(c, step)}</div>`;
  }

  wrap.innerHTML = `
    <p class="step__question">${step.q}</p>
    ${body}
    ${extraHtml}
    ${conditionalHtml}
  `;
  return wrap;
}

STEPS.forEach((step, i) => stepsEl.appendChild(renderStep(step, i)));

// Wire conditional reveals
STEPS.forEach((step) => {
  if (!step.conditional) return;
  const group = stepsEl.querySelectorAll(`input[name="${step.name}"]`);
  const condWrap = document.getElementById(`cond-${step.name}`);
  const condInput = condWrap.querySelector("input, textarea");
  group.forEach((input) => {
    input.addEventListener("change", () => {
      const shouldShow = input.value === step.conditional.on && input.checked;
      if (shouldShow) {
        condWrap.classList.add("is-visible");
      } else if (!Array.from(group).some((i2) => i2.checked && i2.value === step.conditional.on)) {
        condWrap.classList.remove("is-visible");
        condInput.required = false;
        condInput.value = "";
      }
      if (input.checked && input.value === step.conditional.on) {
        condInput.required = !!step.conditional.required;
      }
    });
  });
});

function showStep(index) {
  document.querySelectorAll(".step").forEach((el) => el.classList.remove("is-active"));
  const el = stepsEl.children[index];
  el.classList.add("is-active");

  btnBack.disabled = index === 0;
  const isLast = index === STEPS.length - 1;
  btnNext.hidden = isLast;
  btnSubmit.hidden = !isLast;

  const pct = ((index + 1) / STEPS.length) * 100;
  progressFill.style.width = `${pct}%`;
  progressLabel.textContent = `Step ${index + 1} of ${STEPS.length}`;
  statusEl.textContent = "";
  statusEl.dataset.state = "";
}

function validateStep(index) {
  const el = stepsEl.children[index];
  const step = STEPS[index];

  if (step.type === "choice") {
    const checked = el.querySelector(`input[name="${step.name}"]:checked`);
    if (step.required && !checked) {
      statusEl.textContent = "Please select an option to continue.";
      statusEl.dataset.state = "error";
      return false;
    }
    if (step.conditional && checked && checked.value === step.conditional.on) {
      const condInput = el.querySelector(`#cond-${step.name} input, #cond-${step.name} textarea`);
      if (step.conditional.required && !condInput.value.trim()) {
        statusEl.textContent = "Please complete the additional field.";
        statusEl.dataset.state = "error";
        condInput.focus();
        return false;
      }
    }
    return true;
  }

  const input = el.querySelector(`[name="${step.name}"]`);
  if (step.required && !input.value.trim()) {
    statusEl.textContent = "This field is required.";
    statusEl.dataset.state = "error";
    input.focus();
    return false;
  }
  if (step.type === "email" && input.value.trim()) {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    if (!emailOk) {
      statusEl.textContent = "Please enter a valid email address.";
      statusEl.dataset.state = "error";
      input.focus();
      return false;
    }
  }
  if (step.extra) {
    const extraInput = el.querySelector(`[name="${step.extra.name}"]`);
    if (step.extra.required && !extraInput.value.trim()) {
      statusEl.textContent = "Please complete both fields to continue.";
      statusEl.dataset.state = "error";
      extraInput.focus();
      return false;
    }
  }
  return true;
}

btnNext.addEventListener("click", () => {
  if (!validateStep(current)) return;
  current = Math.min(current + 1, STEPS.length - 1);
  showStep(current);
});

btnBack.addEventListener("click", () => {
  current = Math.max(current - 1, 0);
  showStep(current);
});

// Duplicate-submission prevention: a fresh submission id per page load,
// a session-scoped guard against re-submitting after a refresh, and the
// submit button disables itself the instant it's pressed.
const SESSION_KEY = "bold-consultation-submitted";
submissionIdInput.value = crypto.randomUUID();

if (sessionStorage.getItem(SESSION_KEY)) {
  form.hidden = true;
  successEl.hidden = false;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateStep(current)) return;
  if (btnSubmit.disabled) return; // already submitting/submitted
  btnSubmit.disabled = true;

  const data = Object.fromEntries(new FormData(form).entries());

  if (SUBMIT_ENDPOINT) {
    // TODO (post-approval): POST `data` to the real capture endpoint here.
  }

  sessionStorage.setItem(SESSION_KEY, "1");
  form.hidden = true;
  successEl.hidden = false;
});

showStep(current);
