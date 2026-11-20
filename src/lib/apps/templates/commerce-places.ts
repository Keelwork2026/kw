import type { AppTemplate } from "../types";
import { PAL } from "../palettes";

export const store: AppTemplate = {
  slug: "app-online-store", name: "Ọja Clothing Store", category: "E-commerce & Retail", industry: "Fashion retail", type: "Online store",
  styles: ["Bold", "Editorial"], level: "Beginner-friendly", featured: true, added: "2026-11-18",
  tagline: "A clothing shop with collections, a working basket and an orders back office.",
  description: "An online clothing store: a storefront with collection filters and a basket you can check out, plus an admin view of orders and stock.",
  useCases: ["Sell clothing online", "Run seasonal collections", "Manage orders and stock"],
  features: ["Storefront", "Collection filters", "Basket and checkout", "Orders back office", "Stock levels"],
  effort: "About 2–3 hours of agent work", stack: "Next.js, Supabase, Paystack or Stripe checkout once connected",
  keywords: ["online shop", "store", "ecommerce", "clothing", "fashion", "shop", "cart", "checkout", "products", "retail", "boutique", "sell online"],
  brand: "Ọja", palette: PAL.ink, shell: "consumer",
  screens: [
    { slug: "shop", label: "Shop", icon: "layout", title: "Shop", modules: [
      { m: "hero", eyebrow: "Harmattan '26 collection", title: "Clothes made in Lagos, cut for every day.", sub: "Adire, linen and cotton pieces in small runs. Free delivery in Lagos over ₦60,000.", cta: "Shop the collection", secondary: "Our story", art: "model", seed: 4 },
      { m: "catalog", title: "New in", filters: ["Dresses", "Shirts", "Bags", "Shoes"], action: "Add to basket", cart: true, cols: 4, items: [
        { title: "Adire wrap dress", meta: "Indigo · Cotton", price: "₦48,000", art: "dress", seed: 1, tag: "Dresses", badge: "New" }, { title: "Linen camp shirt", meta: "Sand · Linen", price: "₦32,000", art: "rack", seed: 2, tag: "Shirts" },
        { title: "Woven market tote", meta: "Natural raffia", price: "₦21,500", art: "bag", seed: 3, tag: "Bags" }, { title: "Leather slides", meta: "Tan · Handmade", price: "₦27,000", art: "shoe", seed: 4, tag: "Shoes" },
        { title: "Kampala midi dress", meta: "Rust · Cotton", price: "₦52,000", art: "dress", seed: 5, tag: "Dresses" }, { title: "Agbada-cut overshirt", meta: "Black · Linen", price: "₦45,000", art: "rack", seed: 6, tag: "Shirts", badge: "Low stock" },
        { title: "Beaded clutch", meta: "Coral beads", price: "₦18,000", art: "bag", seed: 7, tag: "Bags" }, { title: "Canvas sneakers", meta: "Off-white", price: "₦29,000", art: "shoe", seed: 8, tag: "Shoes" },
      ] },
    ] },
    { slug: "orders", label: "Orders", icon: "inbox", title: "Orders (admin)", modules: [
      { m: "kpis", items: [{ label: "Sales today", value: "₦486,000", delta: "14 orders" }, { label: "To fulfil", value: "9", tone: "warn" }, { label: "Returns open", value: "2", tone: "neutral" }, { label: "Avg. order", value: "₦34,700" }] },
      { m: "table", title: "Recent orders", search: "Search orders", columns: ["Order", "Customer", "Items", "Total", "Status"], status: 4, filter: 4, tones: { Paid: "info", Packed: "warn", Shipped: "good", Returned: "bad" }, rows: [
        ["#1048", "Tolu A.", "2", "₦69,500", "Paid"], ["#1047", "Kemi O.", "1", "₦48,000", "Packed"], ["#1046", "Ibrahim S.", "3", "₦97,000", "Shipped"], ["#1045", "Grace E.", "1", "₦21,500", "Shipped"], ["#1044", "David K.", "1", "₦32,000", "Returned"],
      ] },
    ] },
  ],
};

export const restaurant: AppTemplate = {
  slug: "app-restaurant-ordering", name: "Ember Kitchen Ordering", category: "Food & Hospitality", industry: "Restaurants", type: "Web app",
  styles: ["Warm", "Bold"], level: "Beginner-friendly", featured: true, added: "2026-11-18",
  tagline: "Online ordering, table bookings and a kitchen view for a restaurant.",
  description: "A restaurant app: a menu customers order from with a basket, a table booking form, and a kitchen board that moves orders from new to ready.",
  useCases: ["Take pickup and delivery orders", "Accept table bookings", "Run the kitchen queue"],
  features: ["Menu with categories", "Basket and checkout", "Table bookings", "Kitchen order board", "Daily sales"],
  effort: "About 2 hours of agent work", stack: "Next.js, Supabase realtime for the kitchen board",
  keywords: ["restaurant", "food", "menu", "ordering", "takeaway", "delivery", "reservations", "booking", "kitchen", "cafe", "website for my restaurant"],
  brand: "Ember", palette: PAL.terracotta, shell: "consumer",
  screens: [
    { slug: "menu", label: "Menu", icon: "layout", title: "Menu", modules: [
      { m: "hero", eyebrow: "Wood-fired · Victoria Island", title: "Order Ember to your door, or book a table.", sub: "Suya-spiced grills, wood-fired flatbreads and slow-cooked stews. Pickup in 20 minutes; delivery across VI and Lekki.", cta: "Order now", secondary: "Book a table", art: "dish", seed: 2, stats: [["20 min", "pickup"], ["12–10pm", "daily"]] },
      { m: "catalog", title: "Tonight's menu", filters: ["Grills", "Flatbreads", "Sides", "Drinks"], action: "Add", cart: true, items: [
        { title: "Suya ribeye", meta: "Yaji butter, charred onions", price: "₦14,500", art: "dish", seed: 1, tag: "Grills", badge: "Chef's pick" }, { title: "Peri-peri chicken", meta: "Half bird, lime", price: "₦9,800", art: "dish", seed: 3, tag: "Grills" },
        { title: "Lamb flatbread", meta: "Ata din din, yoghurt", price: "₦8,200", art: "dish", seed: 5, tag: "Flatbreads" }, { title: "Smoky jollof", meta: "Wood-fire finished", price: "₦4,500", art: "dish", seed: 7, tag: "Sides" },
        { title: "Plantain & honey", meta: "Dodo, chilli honey", price: "₦3,200", art: "dish", seed: 9, tag: "Sides" }, { title: "Zobo spritz", meta: "Hibiscus, ginger, soda", price: "₦3,000", art: "drinks", seed: 2, tag: "Drinks" },
      ] },
    ] },
    { slug: "book", label: "Book a table", icon: "clock", title: "Book a table", modules: [
      { m: "form", title: "Reservation", sub: "For groups over 10, message us.", submit: "Request table", success: { title: "Table requested", body: "We'll confirm by text within 15 minutes." }, steps: [{ title: "Details", fields: [
        { label: "Name", type: "text", required: true }, { label: "Phone", type: "tel", required: true }, { label: "Date", type: "date", required: true }, { label: "Time", type: "time", required: true }, { label: "Guests", type: "select", options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"], required: true }, { label: "Anything we should know?", type: "textarea" },
      ] }] },
    ] },
    { slug: "kitchen", label: "Kitchen", icon: "bolt", title: "Kitchen board (staff)", modules: [
      { m: "kanban", title: "Orders now", columns: [
        { name: "New", cards: [{ title: "#214 · Pickup", meta: "Suya ribeye, Smoky jollof", value: "7:42" }, { title: "#215 · Delivery", meta: "2× Peri-peri, Zobo spritz", value: "7:44" }] },
        { name: "Cooking", cards: [{ title: "#212 · Table 6", meta: "Lamb flatbread ×2", value: "7:31" }] },
        { name: "Ready", cards: [{ title: "#211 · Pickup", meta: "Plantain & honey", value: "7:28" }] },
      ] },
    ] },
  ],
};

export const hotel: AppTemplate = {
  slug: "app-hotel-booking", name: "Lagoon House Bookings", category: "Food & Hospitality", industry: "Hotels and guesthouses", type: "Web app",
  styles: ["Premium", "Warm"], level: "Advanced", added: "2026-11-19",
  tagline: "Room booking for guests, with a front-desk occupancy view.",
  description: "A boutique hotel booking app: rooms with filters and a basket-style booking, a booking form with dates and guests, and front-desk occupancy and arrivals.",
  useCases: ["Take direct bookings", "Manage arrivals and occupancy", "Sell add-ons like airport pickup"],
  features: ["Room catalogue", "Booking flow", "Arrivals list", "Occupancy dashboard"],
  effort: "About 2–3 hours of agent work", stack: "Next.js, Supabase, availability rules per room",
  keywords: ["hotel", "booking", "rooms", "guesthouse", "airbnb", "reservations", "hospitality", "resort", "travel"],
  brand: "Lagoon House", palette: PAL.teal, shell: "consumer",
  screens: [
    { slug: "stay", label: "Stay", icon: "layout", title: "Rooms", modules: [
      { m: "hero", eyebrow: "Boutique hotel · Ikoyi", title: "Twelve rooms on the lagoon.", sub: "Quiet rooms, a rooftop pool and breakfast until 11. Book direct for free airport pickup.", cta: "Check availability", art: "beach", seed: 3 },
      { m: "catalog", title: "Choose a room", filters: ["City view", "Lagoon view", "Suites"], action: "Select", cart: true, cols: 3, items: [
        { title: "Classic King", meta: "22 m² · City view · Sleeps 2", price: "₦95,000", art: "living-room", seed: 1, tag: "City view" }, { title: "Lagoon King", meta: "26 m² · Balcony · Sleeps 2", price: "₦128,000", art: "living-room", seed: 4, tag: "Lagoon view", badge: "Most booked" },
        { title: "Garden Twin", meta: "24 m² · Courtyard · Sleeps 2", price: "₦89,000", art: "garden", seed: 2, tag: "City view" }, { title: "Lagoon Suite", meta: "44 m² · Lounge · Sleeps 3", price: "₦210,000", art: "apartment", seed: 3, tag: "Suites" },
      ] },
    ] },
    { slug: "book", label: "Book", icon: "clock", title: "Book your stay", modules: [
      { m: "form", title: "Your stay", submit: "Confirm booking", success: { title: "Booking confirmed", body: "Confirmation LH-3381 is in your inbox. Reply to it to add airport pickup." }, steps: [
        { title: "Dates", fields: [{ label: "Check-in", type: "date", required: true }, { label: "Check-out", type: "date", required: true }, { label: "Guests", type: "select", options: ["1", "2", "3"], required: true }] },
        { title: "Guest", fields: [{ label: "Full name", type: "text", required: true }, { label: "Email", type: "email", required: true }, { label: "Phone", type: "tel", required: true }, { label: "Arrival time", type: "time" }] },
      ] },
    ] },
    { slug: "desk", label: "Front desk", icon: "users", title: "Front desk (staff)", modules: [
      { m: "kpis", items: [{ label: "Occupancy tonight", value: "83%", delta: "10 of 12 rooms" }, { label: "Arrivals today", value: "4", tone: "info" }, { label: "Departures", value: "3" }, { label: "ADR this month", value: "₦118,400" }] },
      { m: "table", title: "Arrivals", columns: ["Guest", "Room", "Nights", "ETA", "Status"], status: 4, tones: { "Checked in": "good", Expected: "info", Late: "warn" }, rows: [["Ama Mensah", "Lagoon King", "3", "14:00", "Checked in"], ["Tom Becker", "Classic King", "2", "16:30", "Expected"], ["Zainab Musa", "Lagoon Suite", "4", "18:00", "Expected"], ["Leo Martins", "Garden Twin", "1", "11:00", "Late"]] },
    ] },
  ],
};

export const property: AppTemplate = {
  slug: "app-property-listings", name: "Keyhaven Property", category: "Real Estate & Construction", industry: "Real estate agencies", type: "Web app",
  styles: ["Premium", "Corporate"], level: "Beginner-friendly", added: "2026-11-19",
  tagline: "Property listings with filters, viewings and an agent pipeline.",
  description: "A real estate agency app: listings to rent or buy with filters, a viewing request form, and an agent dashboard with enquiries and a deals pipeline.",
  useCases: ["Publish listings", "Book viewings", "Track enquiries to completion"],
  features: ["Listings with filters", "Viewing requests", "Enquiry inbox", "Agent pipeline"],
  effort: "About 2 hours of agent work", stack: "Next.js, Supabase, image storage",
  keywords: ["real estate", "property", "listings", "homes", "rent", "buy", "estate agent", "realtor", "apartments", "houses"],
  brand: "Keyhaven", palette: PAL.navy, shell: "consumer",
  screens: [
    { slug: "listings", label: "Listings", icon: "layout", title: "Homes", modules: [
      { m: "hero", eyebrow: "Lekki · Ikoyi · Yaba", title: "Find a home you'll want to stay in.", sub: "Verified listings with real photos, clear fees and same-week viewings.", cta: "Search homes", secondary: "List a property", art: "house", seed: 2 },
      { m: "catalog", title: "Available now", filters: ["To rent", "For sale"], action: "Request viewing", cols: 3, items: [
        { title: "3-bed terrace, Lekki Phase 1", meta: "3 bed · 3 bath · Serviced", price: "₦8.5M / yr", art: "house", seed: 1, tag: "To rent" }, { title: "2-bed flat, Yaba", meta: "2 bed · 2 bath · Near the tech hub", price: "₦3.2M / yr", art: "apartment", seed: 2, tag: "To rent" },
        { title: "4-bed duplex, Ikoyi", meta: "4 bed · 5 bath · Pool", price: "₦420M", art: "house", seed: 3, tag: "For sale", badge: "New" }, { title: "Studio, Victoria Island", meta: "Studio · Furnished", price: "₦4.0M / yr", art: "apartment", seed: 5, tag: "To rent" },
        { title: "Plot, Ibeju-Lekki", meta: "600 m² · C of O", price: "₦38M", art: "map", seed: 2, tag: "For sale" }, { title: "Penthouse, Ikoyi", meta: "3 bed · Lagoon views", price: "₦610M", art: "skyline", seed: 4, tag: "For sale" },
      ] },
    ] },
    { slug: "agent", label: "Agent", icon: "workflow", title: "Agent dashboard", modules: [
      { m: "kpis", items: [{ label: "Live listings", value: "64" }, { label: "Viewings this week", value: "23", tone: "info" }, { label: "Offers", value: "5", tone: "warn" }, { label: "Let or sold (30d)", value: "11", delta: "↑ 3" }] },
      { m: "kanban", title: "Deals", columns: [
        { name: "Enquiry", cards: [{ title: "Yaba 2-bed", meta: "Ifeoma N. · today" }, { title: "VI studio", meta: "Mark T. · yesterday" }] },
        { name: "Viewing", cards: [{ title: "Lekki terrace", meta: "Sat 11:00 · The Oyelaran family" }] },
        { name: "Offer", cards: [{ title: "Ikoyi duplex", meta: "Offer ₦400M · in negotiation", value: "₦420M" }] },
        { name: "Completed", cards: [{ title: "Ibeju-Lekki plot", meta: "Signed Nov 15", value: "₦38M" }] },
      ] },
    ] },
  ],
};

export const construction: AppTemplate = {
  slug: "app-construction-sites", name: "Steelline Site Manager", category: "Real Estate & Construction", industry: "Construction", type: "Internal tool",
  styles: ["Bold", "Technical"], level: "Advanced", added: "2026-11-19",
  tagline: "Projects, site diaries, crews and materials for a construction company.",
  description: "An operations tool for a construction firm: project progress and budget, a site diary form, crew schedules and a materials order list with delivery status.",
  useCases: ["Track progress across sites", "Log daily site reports", "Order and track materials"],
  features: ["Project progress", "Budget vs spend", "Daily site diary", "Crew schedule", "Materials orders"],
  effort: "About 3 hours of agent work", stack: "Next.js, Supabase, photo uploads",
  keywords: ["construction", "construction company", "contractor", "site", "builders", "projects", "materials", "civil engineering", "crew"],
  brand: "Steelline", palette: PAL.amber, shell: "admin", user: { name: "Emeka Obi", role: "Operations manager" },
  screens: [
    { slug: "sites", label: "Sites", icon: "layout", title: "Active sites", modules: [
      { m: "kpis", items: [{ label: "Active sites", value: "4" }, { label: "Budget spent", value: "61%", delta: "₦1.9B of ₦3.1B" }, { label: "Days without incident", value: "84", tone: "good" }, { label: "Delayed deliveries", value: "2", tone: "warn" }] },
      { m: "progress", title: "Progress", items: [{ title: "Admiralty Mixed-Use, Lekki", meta: "Frame — level 6 of 9", pct: 64 }, { title: "Ikeja Clinic Extension", meta: "Finishes", pct: 88 }, { title: "Ajah Housing, Phase 2", meta: "Foundations", pct: 21 }, { title: "Ogba Warehouse", meta: "Roofing", pct: 73 }] },
      { m: "chart", title: "Budget vs spend (₦M)", kind: "bar", labels: ["Admiralty", "Ikeja", "Ajah", "Ogba"], series: [{ label: "Budget", values: [1450, 520, 780, 350] }, { label: "Spent", values: [940, 470, 190, 270] }] },
    ] },
    { slug: "diary", label: "Site diary", icon: "edit", title: "Daily site report", modules: [
      { m: "form", title: "Today's report", submit: "Submit report", success: { title: "Report filed", body: "The project manager and client rep have been notified." }, steps: [{ title: "Report", fields: [
        { label: "Site", type: "select", options: ["Admiralty Mixed-Use", "Ikeja Clinic Extension", "Ajah Housing", "Ogba Warehouse"], required: true }, { label: "Date", type: "date", required: true }, { label: "Workers on site", type: "number", required: true }, { label: "Weather", type: "select", options: ["Dry", "Light rain", "Heavy rain", "Harmattan haze"] }, { label: "Work completed", type: "textarea", required: true }, { label: "Issues or hazards", type: "textarea" },
      ] }] },
    ] },
    { slug: "materials", label: "Materials", icon: "database", title: "Materials orders", modules: [
      { m: "table", title: "Orders", search: "Search materials", action: "New order", columns: ["Material", "Site", "Qty", "Supplier", "Status"], status: 4, filter: 4, tones: { Delivered: "good", "In transit": "info", Delayed: "warn", Ordered: "neutral" }, rows: [
        ["Rebar 16mm", "Admiralty", "12 t", "Kanu Steel", "In transit"], ["Cement (Dangote 42.5)", "Ajah", "800 bags", "BuildMart", "Delivered"], ["Roofing sheets", "Ogba", "340", "Alu Roofs", "Delayed"], ["Ceramic tiles", "Ikeja", "420 m²", "Tile Hub", "Ordered"], ["Ready-mix C30", "Admiralty", "48 m³", "Lafarge", "Delayed"],
      ] },
    ] },
    { slug: "crews", label: "Crews", icon: "users", title: "Crew schedule", modules: [
      { m: "calendar", title: "This week", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], events: [
        { day: 0, start: "07:00", end: "15:00", title: "Concrete pour L6", meta: "Admiralty · Crew A", tone: "warn" }, { day: 1, start: "08:00", end: "16:00", title: "Tiling", meta: "Ikeja · Crew C", tone: "info" }, { day: 2, start: "07:00", end: "13:00", title: "Excavation", meta: "Ajah · Crew B", tone: "info" }, { day: 3, start: "08:00", end: "12:00", title: "Safety audit", meta: "All sites", tone: "bad" }, { day: 4, start: "07:00", end: "15:00", title: "Roof sheeting", meta: "Ogba · Crew D", tone: "good" },
      ] },
    ] },
  ],
};
