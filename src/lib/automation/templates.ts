import type { Definition } from "./definition";

export type WorkflowTemplate = { key: string; name: string; trigger: "manual" | "webhook" | "schedule"; schedule?: string; description: string; category: "Sales" | "Operations" | "Reporting" | "Customers"; definition: Definition };

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "order-to-slack",
    name: "New order → Slack",
    trigger: "webhook",
    category: "Sales",
    description: "A signed webhook from your shop posts each new order to a Slack channel.",
    definition: { steps: [
      { id: "notify", type: "slack", text: "New order {{trigger.body.order_id}} from {{trigger.body.customer_name}} — {{trigger.body.total}}" },
    ] },
  },
  {
    key: "daily-summary",
    name: "Daily summary email",
    trigger: "schedule",
    schedule: "0 7 * * 1-5",
    category: "Reporting",
    description: "Weekdays at 07:00 UTC, fetch yesterday's stats and email a summary.",
    definition: { steps: [
      { id: "fetch_stats", type: "http", method: "GET", url: "https://your-app.example.com/api/stats/yesterday", headers: { Authorization: "Bearer {{secrets.STATS_API_TOKEN}}" }, retries: { max: 3, backoffSeconds: 60 } },
      { id: "send", type: "email", dependsOn: ["fetch_stats"], from: "reports@your-app.example.com", to: "team@your-app.example.com", subject: "Yesterday: {{steps.fetch_stats.output.json.orders}} orders", text: "Orders: {{steps.fetch_stats.output.json.orders}}\nRevenue: {{steps.fetch_stats.output.json.revenue}}" },
    ] },
  },
  {
    key: "signups-to-crm",
    name: "Forward sign-ups to a CRM",
    trigger: "webhook",
    category: "Customers",
    description: "Business addresses only, with retries.",
    definition: { steps: [
      { id: "shape", type: "transform", output: { email: "{{trigger.body.email}}", name: "{{trigger.body.name}}" } },
      { id: "forward", type: "http", method: "POST", dependsOn: ["shape"], url: "https://api.your-crm.example.com/v1/contacts",
        condition: { left: "trigger.body.is_business_email", op: "eq", right: true },
        headers: { Authorization: "Bearer {{secrets.CRM_API_KEY}}", "Content-Type": "application/json" },
        body: "{\"email\": \"{{steps.shape.output.email}}\", \"name\": \"{{steps.shape.output.name}}\"}",
        retries: { max: 5, backoffSeconds: 30 } },
    ] },
  },
  {
    key: "payment-received",
    name: "Payment received → Slack and receipt",
    trigger: "webhook",
    category: "Sales",
    description: "When your app reports a paid order, tell the team in Slack and email the customer a receipt.",
    definition: { steps: [
      { id: "team", type: "slack", condition: { left: "trigger.body.status", op: "eq", right: "paid" }, text: "Payment received: {{trigger.body.amount}} from {{trigger.body.customer_name}} (order {{trigger.body.order_id}})" },
      { id: "receipt", type: "email", condition: { left: "trigger.body.status", op: "eq", right: "paid" }, from: "receipts@your-app.example.com", to: "{{trigger.body.customer_email}}", subject: "Receipt for order {{trigger.body.order_id}}", text: "Thank you — we received {{trigger.body.amount}} for order {{trigger.body.order_id}}." },
    ] },
  },
  {
    key: "lead-follow-up",
    name: "Follow up a new lead next day",
    trigger: "webhook",
    category: "Customers",
    description: "A day after someone fills in your contact form, send them a friendly follow-up email.",
    definition: { steps: [
      { id: "wait", type: "delay", seconds: 86400 },
      { id: "follow_up", type: "email", dependsOn: ["wait"], condition: { left: "trigger.body.email", op: "exists" }, from: "hello@your-app.example.com", to: "{{trigger.body.email}}", subject: "Thanks for getting in touch, {{trigger.body.name}}", text: "Hi {{trigger.body.name}},\n\nThanks for your message yesterday. Is there anything else we can help with?\n" },
    ] },
  },
  {
    key: "weekly-slack-report",
    name: "Weekly numbers to Slack",
    trigger: "schedule",
    schedule: "0 8 * * 1",
    category: "Reporting",
    description: "Mondays at 08:00 UTC, fetch last week's numbers from your app and post them to Slack.",
    definition: { steps: [
      { id: "fetch", type: "http", method: "GET", url: "https://your-app.example.com/api/stats/last-week", headers: { Authorization: "Bearer {{secrets.STATS_API_TOKEN}}" }, retries: { max: 3, backoffSeconds: 120 } },
      { id: "post", type: "slack", dependsOn: ["fetch"], text: "Last week: {{steps.fetch.output.json.signups}} sign-ups, {{steps.fetch.output.json.orders}} orders, {{steps.fetch.output.json.revenue}} revenue." },
    ] },
  },
  {
    key: "booking-to-team",
    name: "New booking → team inbox",
    trigger: "webhook",
    category: "Operations",
    description: "Email the team whenever a booking is made, with the time and the customer's note.",
    definition: { steps: [
      { id: "tell_team", type: "email", from: "bookings@your-app.example.com", to: "team@your-app.example.com", subject: "New booking: {{trigger.body.service}} on {{trigger.body.date}}", text: "{{trigger.body.customer_name}} booked {{trigger.body.service}} on {{trigger.body.date}} at {{trigger.body.time}}.\nNote: {{trigger.body.note}}" },
    ] },
  },
];
