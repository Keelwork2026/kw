/**
 * Simple Mode ("Explain Like I'm 5"): the words Keelwork uses when someone
 * wants everything explained plainly. One place for every simple label,
 * explanation, analogy, guided step and error rewrite, so new features get
 * simple wording by adding entries here rather than building a second UI.
 *
 * Writing rules (checked in simple.test.ts): short sentences, everyday words,
 * no jargon in labels, say what a button does and what comes next. Simple,
 * not babyish.
 */
import type { ProjectTab } from "@/lib/menu";

export const SIMPLE_COOKIE = "kw_simple";
export const SIMPLE_EVENT = "kw-simple-change";

export type Step = { title: string; say: string };
export type Guide = {
  /** The page in plain words. */
  title: string;
  /** What this place is for, in one or two short sentences. */
  what: string;
  /** A familiar comparison. */
  like?: string;
  /** Why it helps. */
  why?: string;
  steps: Step[];
  /** Where to go after this page. */
  next?: { label: string; href: string };
  /** Words on this page worth explaining (GLOSSARY keys). */
  terms?: string[];
};

/** Everyday explanations for words the platform can't avoid. */
export const GLOSSARY: Record<string, { word: string; means: string; like: string }> = {
  app: { word: "App", means: "A tool people use on a phone or computer.", like: "Like a shop that is open on a screen instead of on a street." },
  website: { word: "Website", means: "Pages people can visit on the internet.", like: "Like a shop window anyone can look into." },
  template: { word: "Template", means: "A ready-made starting point you can change.", like: "Like a coloring book page. The lines are drawn; you pick the colors." },
  connector: { word: "Connector", means: "A link between Keelwork and another app you use.", like: "Like a bridge. It lets two apps talk to each other." },
  automation: { word: "Automation", means: "A job the computer does for you, by itself.", like: "Like an alarm clock. You set it once and it rings at the right time." },
  database: { word: "Database", means: "Where your app keeps its information.", like: "Like a tidy cupboard with labeled boxes, so you can find things later." },
  ai: { word: "AI", means: "Software that reads your words and helps you do things.", like: "Like a helpful assistant who listens and then gets to work." },
  agent: { word: "Agent", means: "An AI helper with one job, like designing or testing.", like: "Like a team of builders, each good at one thing." },
  deploy: { word: "Deploy", means: "Put your finished app online so people can use it.", like: "Like opening the doors of a new shop." },
  publish: { word: "Publish", means: "Make your work visible to other people.", like: "Like pinning your poster on a public notice board." },
  preview: { word: "Preview", means: "A private look at your app before everyone sees it.", like: "Like trying on clothes in the fitting room." },
  domain: { word: "Domain", means: "Your website's address, like keelwork.dev.", like: "Like the street address of your house." },
  api: { word: "API", means: "A way for two computer programs to ask each other for things.", like: "Like a waiter. You order, the waiter brings it back." },
  secret: { word: "Secret (key)", means: "A private password that lets your app use another service.", like: "Like a house key. Keep it safe and never share it." },
  backend: { word: "Backend", means: "The hidden part of an app that stores and checks things.", like: "Like a restaurant kitchen. Guests don't see it, but it makes the food." },
  migration: { word: "Migration", means: "A saved change to how your information is organized.", like: "Like adding a new shelf to your cupboard." },
  code: { word: "Code", means: "The written instructions that make an app work.", like: "Like a recipe the computer follows." },
  test: { word: "Test", means: "A check that something works as it should.", like: "Like tasting the soup before you serve it." },
  security: { word: "Security", means: "Keeping your app and your users' information safe.", like: "Like locks on doors and windows." },
  analytics: { word: "Analytics", means: "Numbers that show how many people visit and what they look at.", like: "Like counting how many people walk into your shop." },
  credits: { word: "Credits", means: "Prepaid units you spend when the AI does work for you.", like: "Like tokens at an arcade." },
  hosting: { word: "Hosting", means: "The computer on the internet where your app lives.", like: "Like the land your house is built on." },
  webhook: { word: "Webhook", means: "A message one app sends another the moment something happens.", like: "Like a doorbell. It rings when someone arrives." },
  incident: { word: "Incident", means: "Something that stopped working and needs a look.", like: "Like a warning light on a car dashboard." },
  rollback: { word: "Roll back", means: "Go back to an earlier version that worked.", like: "Like pressing undo." },
  environment: { word: "Environment", means: "A separate copy of your app: one for trying things, one for real users.", like: "Like a rehearsal stage and the real show." },
  plan: { word: "Plan", means: "The list of what will be built, for you to approve first.", like: "Like an architect's drawing before building a house." },
  sandbox: { word: "Sandbox", means: "A safe, separate computer where your app is built and tried.", like: "Like a practice kitchen. Mistakes there don't reach real guests." },
  repository: { word: "Repository", means: "The folder where all of a project's files are kept.", like: "Like a filing cabinet for one project." },
};

export const SIMPLE_GROUPS: Record<string, string> = {
  overview: "Start here",
  build: "Make things",
  data: "Your information",
  quality: "Check it works",
  ship: "Put it online",
  workspace: "Your account",
};

/** Main menu pages, keyed by menu slug. */
export const SIMPLE_ITEMS: Record<string, Guide & { label: string; hint: string }> = {
  dashboard: {
    label: "Home", hint: "See how everything is going",
    title: "Your home page", what: "This page shows what is happening with all your projects.", like: "Think of it like the front page of a newspaper about your work.",
    steps: [{ title: "Look at your projects", say: "Your newest projects are near the top." }, { title: "Check for anything waiting", say: "If something needs your yes, it shows here." }, { title: "Pick what to do next", say: "Open a project, or start a new one." }],
    next: { label: "Make something new", href: "/new-project" }, terms: ["app", "agent", "incident"],
  },
  projects: {
    label: "My projects", hint: "Everything you are making",
    title: "Your projects", what: "Every app and website you are making is listed here.", like: "Think of it like a shelf with one folder for each thing you build.",
    steps: [{ title: "Find a project", say: "Each card is one project. Click it to open it." }, { title: "Or start a new one", say: "Press “Create a project” to make something new." }],
    next: { label: "Make something new", href: "/new-project" }, terms: ["app"],
  },
  integrations: {
    label: "Connect my apps", hint: "Link the other apps you already use",
    title: "Connect your apps", what: "Here you link Keelwork to apps you already use, like payments or email.", like: "Connectors are like bridges. They help two different apps talk to each other.",
    why: "Your app can then take payments, send emails, or use maps.",
    steps: [{ title: "Find the app you want", say: "Search for it, or tap a group like “Communications”." }, { title: "Open it", say: "You will see what it does and what it needs." }, { title: "Add its private key", say: "Copy the key from that app's website and paste it here. We keep it locked away." }],
    terms: ["connector", "secret", "api"],
  },
  automation: {
    label: "Do tasks automatically", hint: "Let the computer do jobs for you",
    title: "Make tasks happen by themselves", what: "Here you set up jobs that run on their own, like sending a weekly email.", like: "An automation is like setting an alarm. You tell the computer what to do, and it does it at the right time.",
    steps: [{ title: "Pick a ready-made one", say: "Start from a template. You can change it later." }, { title: "Choose when it runs", say: "For example, every Monday at 9 am." }, { title: "Switch it on", say: "Press Run once to try it. You can pause it any time." }],
    terms: ["automation", "webhook"],
  },
  "new-project": {
    label: "Make something new", hint: "Describe it and we plan it with you",
    title: "Let's make something new!", what: "Tell us what you want to make. We plan it with you before anything is built.", like: "Like telling a builder what house you want. They draw it first, and you say yes before they start.",
    steps: [{ title: "Give it a name", say: "Any name is fine. You can change it later." }, { title: "Say what it should do", say: "For example: “A booking website for my hair salon.”" }, { title: "Check the plan", say: "We show you a plan. Nothing is built until you say yes." }],
    terms: ["plan", "agent"],
  },
  builder: {
    label: "Build with AI", hint: "Chat, see the plan, watch it get built",
    title: "Build with AI helpers", what: "Here you talk to AI helpers who build your app for you.", like: "Like working with a team of builders. You say what you want; they do the work and show you each step.",
    steps: [{ title: "Chat about your idea", say: "Tell the planner what your app should do." }, { title: "Approve the plan", say: "Read the plan. Say yes when it looks right." }, { title: "Watch it get built", say: "Each job appears on a board as the helpers work." }, { title: "Take a look", say: "Open the preview to see your app." }],
    terms: ["ai", "agent", "plan", "preview"],
  },
  templates: {
    label: "Ready-made designs", hint: "Start from something already designed",
    title: "Start from a ready-made design", what: "Pick a design that is already made. Then change the words, pictures and colors.", like: "A template is like a ready-made drawing. Use it as it is, or change it to make it yours.",
    steps: [{ title: "Look through the designs", say: "Each card shows what you could make." }, { title: "Open one you like", say: "You can see every page before you choose." }, { title: "Use it", say: "We copy it into a new project for you to change." }],
    terms: ["template"],
  },
  sites: {
    label: "Websites", hint: "Get a full website from a few answers",
    title: "Make a website", what: "Answer a few questions about your business. We write a whole website for you.", like: "Think of it like building your own house. You choose the rooms, decide how they look, and arrange everything.",
    steps: [{ title: "What is your website about?", say: "Tell us about your restaurant, business, school or project." }, { title: "Choose how it looks", say: "Pick a style you like. You can change it later." }, { title: "Add your information", say: "Change any words and pictures." }, { title: "Take a look", say: "See it on a computer, tablet and phone." }, { title: "Share it", say: "Share a link, or download it to put online." }],
    next: { label: "Make a website", href: "/sites/new" }, terms: ["website", "template", "preview"],
  },
  design: {
    label: "Change how it looks", hint: "Click a part of your app and say how to change it",
    title: "Change how things look", what: "Click any part of your app's preview, then say how it should look.", like: "Like pointing at a wall and telling the painter: “Make this one blue.”",
    steps: [{ title: "Open a preview", say: "Pick a project and open its preview." }, { title: "Click a part", say: "Turn on Design mode, then click a button, title or picture." }, { title: "Say the change", say: "For example: “Make this bigger and green.”" }],
    terms: ["preview"],
  },
  database: {
    label: "Where info is stored", hint: "See how your app keeps its information",
    title: "Where your information is stored", what: "This shows how your app keeps its information, like customers or orders.", like: "A database is like a cupboard where you keep your information neatly, so you can find it later.",
    steps: [{ title: "Look at the boxes", say: "Each “table” is one box, like Customers or Orders." }, { title: "Check new changes", say: "When the helpers add a new box, it waits here for you." }, { title: "Say yes to apply it", say: "Press apply to add the change to your real app." }],
    terms: ["database", "migration"],
  },
  backend: {
    label: "Behind the scenes", hint: "The hidden parts that make your app work",
    title: "Behind the scenes", what: "This lists the hidden parts of your app that do the work and keep it safe.", like: "Like the kitchen of a restaurant. Guests don't see it, but it makes everything happen.",
    steps: [{ title: "Look down the list", say: "Each line is one job the hidden part does." }, { title: "Look for warnings", say: "A warning means a safety check is missing. Ask the helpers to fix it." }],
    terms: ["backend", "api"],
  },
  agents: {
    label: "Your AI helpers", hint: "Meet the helpers who build for you",
    title: "Meet your AI helpers", what: "Eight AI helpers build your projects. Each one is good at one job.", like: "Like a building team: one draws the plan, one builds, one checks the work.",
    steps: [{ title: "Read who does what", say: "Each card says what that helper does." }, { title: "Know when you're asked", say: "Anything risky waits for your yes first." }],
    terms: ["agent", "ai"],
  },
  testing: {
    label: "Check it works", hint: "Make sure everything works well",
    title: "Check that it works", what: "Here we check your app for problems before people use it.", like: "Like tasting the soup before you serve it to guests.",
    steps: [{ title: "Run a check", say: "Press the button to start. It takes a few minutes." }, { title: "Read the results", say: "Green means good. Red means something needs fixing." }, { title: "Ask for a fix", say: "Press “Ask the agents to fix this”. Then check again." }],
    terms: ["test", "incident"],
  },
  security: {
    label: "Keep it safe", hint: "Find and fix safety problems",
    title: "Keep your app safe", what: "Here we look for safety problems, like a password left where others could see it.", like: "Like checking that every door and window is locked before you leave.",
    steps: [{ title: "Run a safety check", say: "Press the button. It looks through your app for you." }, { title: "Fix what it finds", say: "Each problem says how to fix it." }, { title: "Serious problems stop going online", say: "Your app can't go online until they are fixed. This keeps your users safe." }],
    terms: ["security", "secret"],
  },
  deployments: {
    label: "Put my app online", hint: "Make your app available to everyone",
    title: "Put your app online", what: "This is where your finished app goes on the internet so people can use it.", like: "Deploying is like opening the doors of a new shop.",
    steps: [{ title: "Try a preview first", say: "A preview is a private copy only you can see." }, { title: "Check it looks right", say: "Click around the preview." }, { title: "Go live", say: "Put it online for everyone. If something breaks, you can go back to the earlier version." }],
    terms: ["deploy", "preview", "rollback", "hosting"],
  },
  hosting: {
    label: "Where my app lives", hint: "The computer on the internet that runs your app",
    title: "Where your app lives", what: "Your app runs on a computer on the internet, in your own account.", like: "Hosting is like the land your house is built on.",
    steps: [{ title: "Pick a project", say: "You will see where that app lives." }],
    terms: ["hosting", "domain"],
  },
  analytics: {
    label: "See how it's going", hint: "How many people visit",
    title: "See how things are going", what: "See how many people visit your app and which pages they look at.", like: "Like counting how many people walk into your shop each day.",
    why: "We count visits without following people around, so their privacy is kept.",
    steps: [{ title: "Pick a project", say: "Choose the app you want to see." }, { title: "Switch counting on", say: "Press “Turn on analytics” once." }, { title: "Come back later", say: "Numbers appear as people visit." }],
    terms: ["analytics"],
  },
  team: {
    label: "My team", hint: "Invite people and choose what they can do",
    title: "Your team", what: "Invite people to work with you, and choose what each person can do.", like: "Like giving someone a key to your office, and deciding which rooms it opens.",
    steps: [{ title: "Invite someone", say: "Type their email address and press Send." }, { title: "Pick their role", say: "The role decides what they can change." }],
  },
  marketplace: {
    label: "Shared designs", hint: "Designs other people shared",
    title: "Designs other people shared", what: "Use free designs made by other Keelwork users, or share your own.", like: "Like a library where people lend each other their best recipes.",
    steps: [{ title: "Browse", say: "Every design here was checked by a person first." }, { title: "Use one", say: "Press install to copy it into a new project." }],
    terms: ["template", "publish"],
  },
  billing: {
    label: "Payments", hint: "Your balance and what you've spent",
    title: "Payments and what you've used", what: "See how many credits you have and what you spent them on.", like: "Credits are like tokens at an arcade. The AI uses a few each time it works for you.",
    steps: [{ title: "Check your balance", say: "Your credits are shown at the top." }, { title: "Set a limit", say: "Pick the most you want to spend each month. We stop there." }, { title: "Add credits if needed", say: "Buy more only when you need them." }],
    terms: ["credits"],
  },
  settings: {
    label: "Settings", hint: "Your account and workspace",
    title: "Your settings", what: "Change your workspace name, your password and who can help you.", like: "Like the settings on your phone.",
    steps: [{ title: "Pick what to change", say: "Each section changes one thing." }, { title: "Press save", say: "Nothing changes until you press the button." }],
  },
  docs: {
    label: "Help and guides", hint: "Learn how Keelwork works",
    title: "Help and guides", what: "Read how Keelwork works, one topic at a time.", like: "Like the instruction booklet that comes with something new.",
    steps: [{ title: "Pick a topic", say: "Start with “From idea to app”." }, { title: "Read at your own pace", say: "Come back any time." }],
  },
};

/** Submenu labels, by their standard wording. */
export const SIMPLE_SUB: Record<string, string> = {
  "Recent projects": "Your latest projects", "Open incidents": "Things that broke", "Waiting for approval": "Waiting for your yes", "Live in production": "What's online now",
  "Active projects": "Projects you're working on", "Archived projects": "Put-away projects", "Create a project": "Make something new",
  "All connectors": "All apps you can connect", "In this project": "Connected to this project", "Secrets": "Private keys",
  "My automations": "My automatic tasks", "Templates": "Ready-made ones", "Recent runs": "What ran lately", "Editor": "Change one",
  "Stack": "What it's built with", "Chat": "Talk to the planner", "Plan": "Check the plan", "Waiting for you": "Waiting for your yes", "Build board": "Watch it get built", "Preview and export": "See it and download it", "Code editor": "The written instructions",
  "Starter templates": "Ready-made designs", "Marketplace templates": "Shared designs", "Import a website": "Copy a page you own",
  "Your websites": "Your websites", "Create a website": "Make a website", "Website templates": "Website designs",
  "Open a preview": "Open a private look", "Tables": "Information boxes", "Migrations": "Changes waiting", "API routes": "Ways in for other apps", "Server actions": "Behind-the-scenes jobs",
  "QA overview": "How good it is", "Issues": "Problems found", "Release readiness": "Ready to go online?", "Test plan": "What we check", "Reports": "Reports", "Run checks": "Run a check", "Run history": "Past checks", "Incidents": "Things that broke",
  "Run a scan": "Run a safety check", "Open findings": "Safety problems to fix", "Accepted risks": "Problems you chose to keep",
  "Deploy": "Put it online", "Deployment history": "Past versions", "Deploy credentials": "Key for your hosting account", "Hosts by project": "Where each app lives", "Visitor analytics": "Visitor numbers",
  "Members and roles": "People and what they can do", "Invite someone": "Invite someone", "Open invitations": "Invites not yet accepted",
  "Browse templates": "Look at designs", "Publish a project": "Share your project", "My submissions": "What you shared",
  "billing:Plan": "Your plan", "Buy credits": "Add credits", "Spending limit": "Monthly spending limit", "Usage history": "What you spent",
  "Organization": "Workspace name", "New organization": "New workspace", "Account security": "Password and sign-in", "Audit log": "Record of important changes", "Support access": "Let our team help",
  "From idea to app": "From idea to app", "The agents": "Your AI helpers", "Credits": "Credits", "Deploying": "Putting it online", "Your code is yours": "You own your app",
};

/** Project tabs. */
export const SIMPLE_TABS: Record<ProjectTab, Guide & { label: string }> = {
  "": { label: "Build", title: "Build your app", what: "Talk to the AI helpers and watch your app get built.", like: "Like a building site with a window where you can watch.", steps: [{ title: "Tell the planner what you want", say: "Type in the chat box, like you would text a friend." }, { title: "Say yes to the plan", say: "Nothing is built until you approve." }, { title: "Watch it get built", say: "Each job moves across the board." }, { title: "Look at your app", say: "Open the preview to see it." }], terms: ["plan", "agent", "preview"] },
  code: { label: "Instructions", title: "Your app's written instructions", what: "These are the files that make your app work. You don't need to touch them.", like: "Code is like a recipe the computer follows.", steps: [{ title: "Just looking is fine", say: "The AI helpers write and change these for you." }, { title: "Change a file if you want", say: "Every change is saved, and old versions can be brought back." }], terms: ["code", "repository"] },
  database: { label: "Stored info", title: "Where your app keeps information", what: "See the boxes your app uses to store things, like customers or orders.", like: "Like a cupboard with labeled boxes.", steps: [{ title: "Look at the boxes", say: "Each table is one box." }, { title: "Apply waiting changes", say: "New boxes wait here until you say yes." }], terms: ["database", "migration"] },
  backend: { label: "Behind the scenes", title: "Behind the scenes", what: "The hidden jobs your app does, and whether each one is safe.", like: "Like a restaurant kitchen.", steps: [{ title: "Look for warnings", say: "A warning means a safety check is missing." }], terms: ["backend", "api"] },
  media: { label: "Pictures", title: "Your pictures", what: "Add your own photos, or take pictures of your app.", like: "Like a photo album for your project.", steps: [{ title: "Upload a photo", say: "Use photos you own. Add a short description for people who can't see it." }, { title: "Take screenshots", say: "We can take pictures of your app's pages for you." }] },
  qa: { label: "Quality check", title: "How good is your app?", what: "We check your app for problems and give it a score.", like: "Like a teacher marking homework, with notes on what to fix.", steps: [{ title: "Run a check", say: "Quick takes a few minutes. Full looks at everything." }, { title: "Read the problems", say: "The most important ones are at the top." }, { title: "Ask for fixes", say: "The AI helpers fix them. Then check again." }], terms: ["test"] },
  tests: { label: "Checks", title: "Run checks", what: "Run checks that make sure your app still works after changes.", like: "Like tasting the soup before serving.", steps: [{ title: "Press Run", say: "Pick a check and start it." }, { title: "Read the result", say: "Green is good. Red shows what broke." }], terms: ["test"] },
  incidents: { label: "Problems", title: "Things that broke", what: "When something stops working, it shows up here.", like: "Like a warning light on a car dashboard.", steps: [{ title: "Read what happened", say: "Each card says what broke and when." }, { title: "Ask for a fix", say: "The helpers suggest a fix. You decide." }], terms: ["incident"] },
  security: { label: "Safety", title: "Keep it safe", what: "Look for safety problems and fix them.", like: "Like checking the locks before you leave home.", steps: [{ title: "Run a safety check", say: "It looks through your app for you." }, { title: "Fix each problem", say: "Serious ones must be fixed before going online." }], terms: ["security", "secret"] },
  deployments: { label: "Put online", title: "Put your app online", what: "Make your app available on the internet.", like: "Like opening the doors of your shop.", steps: [{ title: "Make a private preview", say: "Only you can see it." }, { title: "Check it", say: "Click around. Does it look right?" }, { title: "Put it online for everyone", say: "If something goes wrong, go back to an earlier version." }], terms: ["deploy", "preview", "rollback", "environment"] },
  analytics: { label: "Visitors", title: "See who visits", what: "See how many people visit and which pages they like.", like: "Like counting people who walk into your shop.", steps: [{ title: "Switch it on", say: "Press the button once." }, { title: "Come back later", say: "Numbers appear as people visit." }], terms: ["analytics"] },
  automations: { label: "Automatic tasks", title: "Tasks that run by themselves", what: "Set up jobs your app does on its own, like a daily email.", like: "Like setting an alarm clock.", steps: [{ title: "Start from a ready-made one", say: "Pick a template below." }, { title: "Choose when it runs", say: "A time, or when something happens." }, { title: "Try it", say: "Press Run once to see it work." }], terms: ["automation", "webhook"] },
  integrations: { label: "Connected apps", title: "Apps connected to this project", what: "See which other apps this project can use, like payments or email.", like: "Like bridges between your app and other apps.", steps: [{ title: "Pick an app", say: "Open it to see what it needs." }, { title: "Add its key", say: "Paste the private key from that app's website." }], terms: ["connector", "secret"] },
  secrets: { label: "Private keys", title: "Private keys", what: "Keys let your app use other services. We lock them away and never show them again.", like: "Like house keys. Keep them safe and never share them.", steps: [{ title: "Copy the key", say: "Get it from the other app's website." }, { title: "Paste it here", say: "Give it the name shown, then press Save." }, { title: "That's it", say: "Even we can't read it after you save." }], terms: ["secret", "environment"] },
};

/** Pages outside the app menu. Longest prefix wins. */
export const SIMPLE_PAGES: { prefix: string; exact?: boolean; guide: Guide }[] = [
  { prefix: "/", exact: true, guide: { title: "Welcome to Keelwork", what: "Keelwork helps you make apps and websites by describing them in your own words.", like: "Like telling a friendly builder what you want, and watching them build it.", steps: [{ title: "Say what you want to make", say: "Type it in the big box. For example: “A website for my bakery.”" }, { title: "Make a free account", say: "So your work is saved." }, { title: "Check the plan", say: "Nothing is built until you say yes." }], next: { label: "Look at ready-made designs", href: "/starters" }, terms: ["app", "website", "ai"] } },
  { prefix: "/starters", guide: { title: "Ready-made designs", what: "Look at websites and apps that are already designed. Open any one to see every page.", like: "A template is like a ready-made drawing. Use it, or change it to make it yours.", steps: [{ title: "Pick a group", say: "For example “Food & Hospitality”." }, { title: "Open a design", say: "See every page before you choose." }, { title: "Use it", say: "Press “Use template”. We make a copy for you to change." }], terms: ["template"] } },
  { prefix: "/pricing", guide: { title: "What it costs", what: "See the plans and what each one includes.", like: "Like a menu with prices.", steps: [{ title: "Compare the plans", say: "Start free. Change plan any time." }, { title: "Know how credits work", say: "The AI uses credits when it works. You can set a monthly limit." }], terms: ["credits"] } },
  { prefix: "/docs", guide: { title: "Help and guides", what: "Read how Keelwork works, one topic at a time.", like: "Like an instruction booklet.", steps: [{ title: "Pick a topic", say: "Start with “From idea to app”." }] } },
  { prefix: "/tutorials", guide: { title: "Step-by-step lessons", what: "Short lessons that show you how to do one thing at a time.", like: "Like a cooking class, one recipe at a time.", steps: [{ title: "Pick a lesson", say: "Follow the steps in order." }] } },
  { prefix: "/sites/new", guide: { title: "Let's make your website!", what: "Answer a few questions. We write every page for you.", like: "Like telling a writer about your business so they can write your brochure.", steps: [{ title: "What is your website about?", say: "Tell us about your business, school or project." }, { title: "Choose how it should look", say: "Pick a design you like. Don't worry, you can change it later." }, { title: "Add your information", say: "Your words, pictures and details." }, { title: "Take a look", say: "See it before anyone else does." }, { title: "Share it", say: "Your website is ready! Share a link or put it online." }], terms: ["website", "template"] } },
  { prefix: "/settings/security", guide: { title: "Keep your account safe", what: "Change your password, and sign out of other computers.", like: "Like changing the locks on your front door.", steps: [{ title: "Use a strong password", say: "At least 10 characters." }, { title: "Add a second step", say: "A code from your phone stops others getting in." }] } },
  { prefix: "/sign-in", guide: { title: "Welcome back", what: "Type your email and password to get back to your work.", like: "Like unlocking your front door.", steps: [{ title: "Type your email and password", say: "Then press Log in." }, { title: "Forgot your password?", say: "Press “Forgot password?” and we email you a link." }] } },
  { prefix: "/sign-up", guide: { title: "Make your free account", what: "An account keeps your projects safe and saved.", like: "Like getting a library card.", steps: [{ title: "Type your email", say: "We use it to sign you in." }, { title: "Pick a password", say: "At least 10 characters." }] } },
  { prefix: "/welcome", guide: { title: "Let's get you started", what: "A few quick questions so we can help you best.", like: "Like a friendly guide showing you around on your first day.", steps: [{ title: "Answer the questions", say: "You can skip any of them." }, { title: "Pick your first project", say: "Start from an idea or a ready-made design." }] } },
];

/** Page titles (PageHeader) in plain words. */
export const SIMPLE_TITLES: Record<string, { title: string; description?: string }> = {
  "AI Agents": { title: "Your AI helpers", description: "Eight AI helpers build your projects. Anything risky waits for your yes." },
  "Automations": { title: "Tasks that run by themselves", description: "Jobs the computer does for you: on a schedule, when something happens, or when you press Run." },
  "Billing and Usage": { title: "Payments and what you've used", description: "Credits pay for the AI's work. Your balance and every charge are here." },
  "Connectors": { title: "Connect my apps", description: "Link the apps you already use, like payments and email, to your projects." },
  "Create Project": { title: "Make something new", description: "Say what you want. We plan it with you. Nothing is built until you say yes." },
  "Create a website": { title: "Make a website", description: "Tell us about your business. We write every page for you." },
  "Documentation": { title: "Help and guides", description: "How Keelwork works, in short topics." },
  "Marketplace": { title: "Shared designs", description: "Free designs from other people. A person checks each one first." },
  "Security": { title: "Keep your account safe", description: "Your password and sign-in." },
  "Settings": { title: "Your settings" },
  "Support access": { title: "Let our team help", description: "Our team can't see your projects unless you say yes. You choose how long, and they can only look." },
  "Team": { title: "Your team", description: "Invite people and choose what each person can do." },
  "Templates": { title: "Ready-made designs", description: "Start from something already designed. Change it to make it yours." },
  "Websites": { title: "Your websites", description: "Full websites written from your answers. Change anything, then share a link." },
  "Audit log": { title: "Record of important changes", description: "A list of important things that happened. Nobody can change it." },
  "Policy reviews": { title: "Things we didn't build", description: "If we said no by mistake, ask us to look again." },
};

/** Common button labels. */
export const SIMPLE_ACTIONS: Record<string, string> = {
  "Deploy production": "Put it online for everyone", "Deploy preview": "Make a private preview", "Roll back to this": "Go back to this version",
  "Apply to database": "Add this change to my app", "Save secret": "Save this key safely", "Create and start planning": "Start planning my app",
  "Approve and build": "Yes, build it", "Approve": "Yes, approve", "Decline": "No, not this", "Deny": "No", "Run now": "Run it now",
  "Propose a fix": "Suggest a fix", "Accept the risk": "Keep it as it is", "Accept risk": "Keep it as it is", "Retest now": "Check again",
  "Run recommended tests": "Run the checks we suggest", "Run selected tests": "Run the checks I picked", "Ask the agents": "Ask the AI helpers",
  "Ask the agents to fix this": "Ask the AI helpers to fix this", "Ask the agents to fix the selected issues": "Ask the AI helpers to fix these",
  "Turn on analytics": "Start counting visitors", "Capture screenshots": "Take pictures of my app", "Use template": "Use this design",
  "Create project from template": "Make a project from this design", "Write my website": "Write my website", "Import page": "Copy this page",
  "Archive project": "Put this project away", "Restore project": "Bring this project back", "Submit for review": "Send it to be checked",
  "Approve for release": "Yes, it's ready", "Save stack": "Save these choices", "Revoke": "Take back access", "Revoke now": "Take back access now",
  "Sign out other sessions": "Sign out on other computers", "Open the billing portal": "Manage my payments", "Continue to checkout": "Go to payment",
  "Save limit": "Save my limit", "Add to project": "Add to my project", "Authorise": "Allow it", "Withdraw authorisation": "Stop allowing it",
};

export const SIMPLE_STATUS: Record<string, string> = {
  live: "online", succeeded: "worked", passed: "passed", done: "done", resolved: "fixed", approved: "approved", saved: "saved",
  failed: "didn't work", error: "problem", rejected: "said no", open: "needs a look", conflict: "needs a choice",
  building: "being built", running: "working", planning: "planning", deploying: "going online", queued: "waiting to start",
  pending: "waiting", waiting_approval: "waiting for your yes", paused: "paused", draft: "not finished", archived: "put away",
};

type Rule = [RegExp, string];
/** Error and status rewrites: what happened, why (when known) and what to do next. */
const RULES: Rule[] = [
  [/invalid request|invalid input|invalid parameter/i, "This information doesn't look right yet. Please check it and try again."],
  [/invalid organi[sz]ation/i, "We couldn't find that workspace. Please reload the page and try again."],
  [/permission|you can't|only owners|read-only access|not allowed|forbidden|403/i, "You aren't allowed to do this here. Ask the owner of this workspace to do it, or to give you more access."],
  [/authenticat|credential|token.*(invalid|expired|fail)|unauthori[sz]ed|401/i, "We couldn't connect your account. Your login details may be wrong. Please try connecting again."],
  [/email and password don't match|password.*incorrect/i, "That email and password don't match. Check them and try again, or reset your password."],
  [/(deploy|build).*(fail|non-zero|exited)|non-zero/i, "Your app couldn't go online yet. Something went wrong while getting it ready. Try again, or look at Checks to see what needs fixing."],
  [/deployment is already in progress/i, "Your app is already going online. Please wait for that to finish, then try again."],
  [/critical security findings block/i, "Your app can't go online yet because of a serious safety problem. Fix it on the Safety tab first. This keeps your users safe."],
  [/DATABASE_URL|database.*(url|connection)/i, "Your app's storage isn't connected yet. Add its address (called DATABASE_URL) on the Private keys tab, then try again."],
  [/sandbox/i, "The practice computer for this project isn't ready. Start it from the Build tab, then try again."],
  [/vault|SECRETS_MASTER_KEYS/i, "Private keys can't be stored on this computer yet. The person who set up Keelwork needs to finish its setup."],
  [/project limit/i, "You have as many projects as your plan allows. Put an old project away, or change your plan on the Payments page."],
  [/characters/i, "That's too short or too long. Please check the length and try again."],
  [/valid email|email address doesn't look right/i, "That email address doesn't look right. Please check it and try again."],
  [/passwords don't match/i, "The two passwords are different. Please type the same password twice."],
  [/tick the box/i, "Please tick the box to say you're sure, then try again."],
  [/rate limit|too many/i, "That's a lot of tries in a short time. Please wait a minute, then try again."],
  [/timeout|timed out|network|fetch failed|ECONN/i, "We couldn't reach the service just now. Please check your internet and try again in a moment."],
  [/AI returned something unexpected/i, "The AI gave a strange answer, so we changed nothing. Please try again."],
  [/migration/i, "This change to your stored information couldn't be added. Read the note beside it, or ask the AI helpers to write a new one."],
  [/Stripe|payment/i, "The payment didn't go through. Nothing was charged. Please try again, or use a different card."],
  [/not found|404/i, "We couldn't find that. It may have been moved or deleted."],
  [/unexpected|internal|500|exception|stack/i, "Something went wrong on our side. Your work is safe. Please try again."],
];

/** The simple version of a message, or the message itself when it's already plain. */
export function simplifyMessage(message: string): string {
  for (const [re, text] of RULES) if (re.test(message)) return text;
  return message;
}

/** Confirmation questions before something can't be undone. */
export function simplifyConfirm(message: string): string {
  if (/delete|remove|permanent|can't be undone|cannot be undone/i.test(message)) return `${message}\n\nIn simple words: this can't be undone. Press OK only if you're sure.`;
  if (/production|live|everyone/i.test(message)) return `${message}\n\nIn simple words: everyone will be able to see this. Press OK to go ahead.`;
  return `${message}\n\nPress OK to go ahead, or Cancel to stop.`;
}

/** Friendly difficulty words for templates. */
export const SIMPLE_LEVEL: Record<string, string> = {
  "Beginner-friendly": "Easy — great for a first project",
  "Intermediate": "Medium — a few more parts to set up",
  "Advanced": "Bigger — lots of parts, take your time",
};

/** Short, kind encouragements shown with a guide; picked by page so they don't flicker. */
export const CHEERS = ["You're doing great. Let's take the next step.", "You can always change this later.", "Don't worry, your work is saved.", "Let's do this together.", "Take your time. There's no rush."];

const generic: Guide = {
  title: "This page", what: "This page is one part of Keelwork. The big title at the top says what it is for.", like: "Like one room in a house. Each room has its own job.",
  steps: [{ title: "Read the title", say: "It tells you what this page does." }, { title: "Look for the colored button", say: "It does the main job on this page." }, { title: "Nothing changes by itself", say: "Changes only happen when you press a button." }],
};

/** The guide for a path: a project tab, a menu page, another known page, or a general one. */
export function guideFor(pathname: string): Guide & { key: string } {
  const project = /^\/projects\/[0-9a-f-]{36}(?:\/([a-z-]+))?/.exec(pathname);
  if (project) {
    const tab = (project[1] ?? "") as ProjectTab;
    const g = SIMPLE_TABS[tab] ?? SIMPLE_TABS[""];
    return { ...g, key: `tab:${tab}` };
  }
  const slug = pathname.split("/")[1] ?? "";
  if (slug === "projects") return { ...SIMPLE_ITEMS.projects!, key: "projects" };
  const page = SIMPLE_PAGES.filter((p) => (p.exact ? pathname === p.prefix : pathname === p.prefix || pathname.startsWith(`${p.prefix}/`))).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  if (page) return { ...page.guide, key: `page:${page.prefix}` };
  const item = SIMPLE_ITEMS[slug];
  if (item) return { ...item, key: slug };
  return { ...generic, key: `generic:${slug}` };
}

export function cheerFor(key: string): string {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CHEERS[h % CHEERS.length]!;
}

/** A submenu label in simple words; item-specific wording ("billing:Plan") wins. */
export function simpleSub(itemSlug: string, label: string): string {
  return SIMPLE_SUB[`${itemSlug}:${label}`] ?? SIMPLE_SUB[label] ?? label;
}
