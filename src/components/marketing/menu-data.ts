export type Tint = "orange" | "pink" | "violet" | "blue" | "green" | "yellow" | "navy";
export type MenuItem = { title: string; description: string; icon: IconName; tint: Tint; href: string; badge?: string };
export type Menu = {
  id: "product" | "solutions" | "resources";
  label: string;
  kicker: string;
  items: MenuItem[];
  feature: { eyebrow: string; title: string; from: string; to: string; href: string };
  footnote: { text: string; link: string; href: string };
};
export type IconName =
  | "sparkles" | "brush" | "database" | "bot" | "bolt" | "code" | "shield" | "plug" | "globe" | "film" | "wave" | "cube"
  | "pen" | "rocket" | "briefcase" | "users" | "wrench" | "building" | "book" | "cap" | "chat" | "list" | "star" | "pulse";

export const MENUS: Menu[] = [
  {
    id: "product",
    label: "Product",
    kicker: "Everything in one workspace",
    items: [
      { title: "AI Builder", description: "Describe an app, approve the plan, watch it build.", icon: "sparkles", tint: "orange", href: "/sign-up" },
      { title: "Design Studio", description: "Click any element to restyle it, pixel by pixel.", icon: "brush", tint: "pink", href: "/sign-up" },
      { title: "Database & Auth", description: "Real tables, logins and storage, ready to use.", icon: "database", tint: "violet", href: "/sign-up" },
      { title: "AI Agents", description: "A team of specialists that review each other.", icon: "bot", tint: "blue", href: "/sign-up", badge: "New" },
      { title: "Automations", description: "Emails, webhooks and schedules without code.", icon: "bolt", tint: "yellow", href: "/sign-up" },
      { title: "Code Editor", description: "Full source, terminal and Git, synced to GitHub.", icon: "code", tint: "navy", href: "/sign-up" },
      { title: "Testing & Security", description: "Every change tested in a sandbox before it ships.", icon: "shield", tint: "green", href: "/sign-up" },
      { title: "Integrations", description: "Stripe, Slack, Google, Microsoft and any API.", icon: "plug", tint: "violet", href: "/sign-up" },
      { title: "Publish & Hosting", description: "One click to your own domain, with rollback.", icon: "globe", tint: "blue", href: "/sign-up" },
      { title: "Motion Studio", description: "Keyframe animations and page transitions, timed on a timeline.", icon: "film", tint: "orange", href: "/sign-up", badge: "New" },
      { title: "Interaction Effects", description: "Scroll, hover and gesture effects that respect reduced motion.", icon: "wave", tint: "pink", href: "/sign-up" },
      { title: "3D Scenes", description: "Interactive 3D models, lights and cameras in the browser.", icon: "cube", tint: "navy", href: "/sign-up", badge: "New" },
    ],
    feature: { eyebrow: "New", title: "Agents now test their own work", from: "#3d2bff", to: "#007f86", href: "/sign-up" },
    footnote: { text: "Start free. Your code always lives in your own GitHub.", link: "Compare plans", href: "/pricing" },
  },
  {
    id: "solutions",
    label: "Solutions",
    kicker: "Made for how you work",
    items: [
      { title: "Designers", description: "Ship the design you drew, not a handoff of it.", icon: "pen", tint: "pink", href: "/sign-up" },
      { title: "Founders", description: "From idea to paying customers in a weekend.", icon: "rocket", tint: "orange", href: "/sign-up" },
      { title: "Agencies", description: "One workspace per client, with approvals.", icon: "briefcase", tint: "blue", href: "/sign-up" },
      { title: "Product teams", description: "Prototype on real data, then hand over real code.", icon: "users", tint: "violet", href: "/sign-up" },
      { title: "Internal tools", description: "Dashboards and admin panels your team will use.", icon: "wrench", tint: "green", href: "/sign-up" },
      { title: "Enterprise", description: "Isolation, audit logs and support you control.", icon: "building", tint: "navy", href: "/#teams" },
    ],
    feature: { eyebrow: "For designers", title: "Keep your craft. Skip the handoff.", from: "#0b78a0", to: "#2f7bff", href: "/sign-up" },
    footnote: { text: "Building for a larger organization?", link: "Talk to our team", href: "/#teams" },
  },
  {
    id: "resources",
    label: "Resources",
    kicker: "Learn, get help, stay current",
    items: [
      { title: "Documentation", description: "How every part of Keelwork works.", icon: "book", tint: "navy", href: "/sign-in?next=/docs" },
      { title: "Tutorials", description: "Step-by-step builds from idea to launch.", icon: "cap", tint: "orange", href: "/sign-in?next=/docs" },
      { title: "Community", description: "Share what you made and get feedback.", icon: "chat", tint: "pink", href: "/sign-in?next=/marketplace" },
      { title: "Changelog", description: "What shipped, week by week.", icon: "list", tint: "blue", href: "/sign-in?next=/docs" },
      { title: "Inspiration", description: "Templates other people remixed.", icon: "star", tint: "yellow", href: "/#templates" },
      { title: "System status", description: "Is everything up right now?", icon: "pulse", tint: "green", href: "/api/health" },
    ],
    feature: { eyebrow: "Guide", title: "Your first app in one sitting", from: "#0b1f3a", to: "#0b78a0", href: "/sign-up" },
    footnote: { text: "Need a hand?", link: "Get help", href: "/sign-in?next=/docs" },
  },
];
