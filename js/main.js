import { SITE_CONFIG } from "./config.js";

/* ---------- Nav links: Instagram / Email ---------- */
/* Wired from SITE_CONFIG. If a value hasn't been verified yet, the link
   is kept in the markup (so the layout matches the approved reference)
   but rendered inert rather than pointing somewhere invented. */
function wireExternalLink(el, { href, title }) {
  if (!el) return;
  if (href) {
    el.href = href;
    el.removeAttribute("aria-disabled");
  } else {
    el.href = "#";
    el.setAttribute("aria-disabled", "true");
    el.title = title;
    el.addEventListener("click", (event) => event.preventDefault());
  }
}

const instagramHref = SITE_CONFIG.instagramUrl || "";
const emailHref = SITE_CONFIG.email ? `mailto:${SITE_CONFIG.email}` : "";

wireExternalLink(document.getElementById("nav-instagram"), {
  href: instagramHref,
  title: "Instagram link coming soon",
});
wireExternalLink(document.getElementById("nav-instagram-mobile"), {
  href: instagramHref,
  title: "Instagram link coming soon",
});
wireExternalLink(document.getElementById("footer-instagram"), {
  href: instagramHref,
  title: "Instagram link coming soon",
});
wireExternalLink(document.getElementById("nav-email"), {
  href: emailHref,
  title: "Email coming soon",
});
wireExternalLink(document.getElementById("nav-email-mobile"), {
  href: emailHref,
  title: "Email coming soon",
});
wireExternalLink(document.getElementById("footer-email"), {
  href: emailHref,
  title: "Email coming soon",
});

/* ---------- Mobile menu ---------- */
const navToggle = document.querySelector(".site-nav__toggle");
const mobileMenu = document.getElementById("mobile-menu");

function closeMobileMenu() {
  if (!navToggle || !mobileMenu) return;
  navToggle.setAttribute("aria-expanded", "false");
  mobileMenu.hidden = true;
}

function openMobileMenu() {
  if (!navToggle || !mobileMenu) return;
  navToggle.setAttribute("aria-expanded", "true");
  mobileMenu.hidden = false;
}

if (navToggle && mobileMenu) {
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    expanded ? closeMobileMenu() : openMobileMenu();
  });

  mobileMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMobileMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMobileMenu();
  });

  document.addEventListener("click", (event) => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    if (!expanded) return;
    if (event.target.closest(".mobile-menu") || event.target.closest(".site-nav__toggle")) {
      return;
    }
    closeMobileMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 720) closeMobileMenu();
  });
}

/* ---------- Subtle one-time panel reveal ---------- */
const panel = document.querySelector(".panel");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (panel) {
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    panel.classList.add("is-visible");
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            panel.classList.add("is-visible");
            observer.disconnect();
          }
        });
      },
      { threshold: 0.12 }
    );
    observer.observe(panel);
  }
}

/* ---------- Enquiry form ---------- */
const form = document.getElementById("enquiry-form");
const statusEl = document.getElementById("form-status");
const submitBtn = form?.querySelector(".submit-btn");

function setStatus(message, state) {
  if (!statusEl) return;
  statusEl.textContent = message;
  if (state) {
    statusEl.dataset.state = state;
  } else {
    delete statusEl.dataset.state;
  }
}

function collectPayload(formEl) {
  const data = new FormData(formEl);
  return Object.fromEntries(data.entries());
}

/**
 * Submits the enquiry.
 *
 * There is no production backend configured for this site yet (see
 * js/config.js). Rather than pretending the enquiry was received, this
 * function is honest about that: if SITE_CONFIG.enquiryEndpoint is unset
 * it tells the visitor how to reach BOLD directly instead of silently
 * discarding their message or falsely claiming success.
 *
 * Once BOLD's Lead Engine / AI Inbox / CRM exposes a submission endpoint,
 * set SITE_CONFIG.enquiryEndpoint and this function will POST the form's
 * JSON payload there — no UI changes required.
 */
async function submitEnquiry(payload) {
  if (!SITE_CONFIG.enquiryEndpoint) {
    const err = new Error("not-configured");
    err.code = "not-configured";
    throw err;
  }

  const response = await fetch(SITE_CONFIG.enquiryEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = new Error("request-failed");
    err.code = "request-failed";
    throw err;
  }
}

if (form) {
  // Only show invalid-field styling after a visitor has actually
  // interacted with a field (or attempted to submit) — never on load.
  form.querySelectorAll(".field").forEach((field) => {
    const control = field.querySelector("input, select, textarea");
    if (!control) return;
    control.addEventListener("blur", () => field.classList.add("is-touched"));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.querySelectorAll(".field").forEach((field) => field.classList.add("is-touched"));
      form.reportValidity();
      setStatus("Please complete the required fields above.", "error");
      return;
    }

    const payload = collectPayload(form);

    if (submitBtn) submitBtn.disabled = true;
    setStatus("Sending your enquiry…");

    try {
      await submitEnquiry(payload);
      setStatus("Thank you — your enquiry has been received. We'll be in touch soon.", "success");
      form.reset();
    } catch (error) {
      if (error.code === "not-configured") {
        const contact = SITE_CONFIG.email
          ? `email us directly at ${SITE_CONFIG.email}`
          : "reach out via Instagram or email";
        setStatus(
          `Our enquiry system is being connected. In the meantime, please ${contact} — nothing above has been lost, feel free to copy it across.`,
          "error"
        );
      } else {
        setStatus(
          "Something went wrong sending your enquiry. Please try again shortly, or reach out via Instagram or email.",
          "error"
        );
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

/* ---------- Footer year ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
