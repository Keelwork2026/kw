import type { Definition } from "./definition";

export type WorkflowTemplate = { key: string; name: string; trigger: "manual" | "webhook" | "schedule"; schedule?: string; description: string; definition: Definition };

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "order-to-slack",
    name: "New order → Slack",
    trigger: "webhook",
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
];
