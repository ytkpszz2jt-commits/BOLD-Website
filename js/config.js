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
   * Points at the "Website enquiry intake" Airtable automation's webhook
   * (base "BOLD Website Enquiries" → table "Leads"). The form in js/main.js
   * POSTs a JSON payload shaped like:
   *
   *   {
   *     name, business, instagram, email, phone,
   *     businessType, revenue, helpWith, budget, message, submittedAt
   *   }
   *
   * and requires zero markup/UI changes to work once the automation is
   * deployed on the Airtable side.
   */
  enquiryEndpoint:
    "https://hooks.airtable.com/workflows/v1/genericWebhook/appzG0hj27hu4djpk/wflXwYR9fM46nQnJx/wtrfgYT8eaXG9H09q",
};
