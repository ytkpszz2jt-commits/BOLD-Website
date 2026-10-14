/**
 * BOLD Consultation — multi-step form logic.
 *
 * Visual design approved by the founder, 2026-09-14; deployed live
 * 2026-10-14. SUBMIT_ENDPOINT below points at the "Consultation intake"
 * Airtable automation (base "BOLD Outreach Consultation" → table
 * "Submissions"). The endpoint this file previously pointed at
 * (base appfkUgT1C3mpdRGa) was an empty, unbuilt placeholder automation
 * in the wrong base that would have silently discarded every real
 * submission — fixed before the first real end-to-end test.
 */

const SUBMIT_ENDPOINT = "https://hooks.airtable.com/workflows/v1/genericWebhook/app8otDUgkYRuWsvZ/wflQM8U2DwtUQ1juW/wtro4jF6ytxx7lhr5";
const LEAD_SOURCE = "BOLD Outreach Consultation"; // keeps this route distinct from the homepage enquiry form's "BOLD Website Enquiry"

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
const introEl = document.getElementById("consult-intro");

// Fallback UUID generator for browsers/contexts where crypto.randomUUID
// is unavailable (older Safari, or a restricted embedding context) —
// only used for the client-side duplicate-submission guard, never for
// anything security-sensitive.
function makeId() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }
}

// sessionStorage can throw in some restricted embedding contexts (private
// browsing edge cases, cross-origin iframes) — treat any failure as
// "no stored state" rather than letting it break the rest of the page.
function safeSessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch (e) {
    return null;
  }
}
function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch (e) {
    /* ignore — duplicate-guard degrades gracefully without it */
  }
}

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

function pad(n) {
  return String(n).padStart(2, "0");
}

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
  progressLabel.textContent = `${pad(index + 1)} / ${pad(STEPS.length)}`;
  statusEl.textContent = "";
  statusEl.dataset.state = "";

  // On narrow viewports, give the question room to breathe past step one —
  // the full introduction has already been read.
  introEl.classList.toggle("is-compact", index > 0);
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
submissionIdInput.value = makeId();

if (safeSessionGet(SESSION_KEY)) {
  form.hidden = true;
  successEl.hidden = false;
}

/**
 * Submits the consultation answers to SUBMIT_ENDPOINT. If that's unset,
 * tells the visitor honestly rather than silently discarding their
 * answers or falsely claiming success. Mirrors js/config.js's
 * submitEnquiry() exactly: URL-encoded body + mode "no-cors", since the
 * Airtable webhook automation this will point at returns no CORS
 * headers, so a JSON POST would be blocked by the browser before it
 * ever arrived. The trade-off is an opaque response — success here
 * means the request was sent, not a confirmed 200.
 */
async function submitConsultation(data) {
  if (!SUBMIT_ENDPOINT) {
    const err = new Error("not-configured");
    err.code = "not-configured";
    throw err;
  }
  try {
    await fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body: new URLSearchParams(data),
    });
  } catch (error) {
    const err = new Error("request-failed");
    err.code = "request-failed";
    throw err;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateStep(current)) return;
  if (btnSubmit.disabled) return; // already submitting/submitted
  btnSubmit.disabled = true;

  const data = Object.fromEntries(new FormData(form).entries());
  data.leadSource = LEAD_SOURCE;
  data.submittedAt = new Date().toISOString();

  try {
    await submitConsultation(data);
    safeSessionSet(SESSION_KEY, "1");
    form.hidden = true;
    successEl.hidden = false;
  } catch (error) {
    btnSubmit.disabled = false;
    if (error.code === "not-configured") {
      statusEl.textContent =
        "Our consultation intake is being connected. In the meantime, please email hello@boldbma.com directly — nothing above has been lost.";
    } else {
      statusEl.textContent =
        "Something went wrong sending your answers. Please try again shortly, or email hello@boldbma.com directly.";
    }
    statusEl.dataset.state = "error";
  }
});

showStep(current);
