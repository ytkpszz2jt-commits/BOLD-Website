/**
 * Site configuration — the single place to wire up real BOLD links and
 * the production enquiry backend. Nothing here is invented: values are
 * intentionally left empty until they can be verified, and the UI treats
 * an empty value as "not yet configured" rather than pretending it works.
 */
export const SITE_CONFIG = {
  // Verified BOLD Instagram profile URL. Not present in this repository —
  // set it here once confirmed (e.g. "https://www.instagram.com/boldbeauty/").
  instagramUrl: "",

  // Verified BOLD business email address. Not present in this repository —
  // set it here once confirmed (e.g. "hello@boldbeauty.com").
  email: "",

  /**
   * Enquiry form submission endpoint.
   *
   * No production backend is configured yet. Leave this as null until
   * BOLD's Lead Engine / AI Inbox / CRM exposes an endpoint to receive
   * enquiries. When ready, set it to that endpoint's URL — the form in
   * js/main.js already POSTs a JSON payload shaped like:
   *
   *   {
   *     name, business, instagram, email, phone,
   *     businessType, revenue, helpWith, budget, message
   *   }
   *
   * and requires zero markup/UI changes to start working.
   */
  enquiryEndpoint: null,
};
