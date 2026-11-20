import type { Site } from "../types";
import { contactPage, footer, legalPages } from "../common";

export const harbourKitchen: Site = {
  slug: "harbour-kitchen", name: "Restaurant site with menu & table booking", category: "Restaurant & Hospitality", style: "Warm editorial", voice: "warm",
  tagline: "Seasonal seafood restaurant with menus, table booking and private dining.",
  description: "A coastal restaurant site with a full menu, online table requests, private dining enquiries, a story page and opening hours — ready for a neighbourhood restaurant or bistro.",
  palette: { bg: "#fbf6ef", surface: "#ffffff", ink: "#1f2a2e", muted: "#5b6669", accent: "#c4532f", accent2: "#e9a24b", soft: "#f5e6d6", line: "#eadccb", onAccent: "#ffffff" },
  fonts: { display: "serif", body: "sans" }, logo: { mark: "wave", word: "Harbour Kitchen" }, radius: "soft",
  announcement: "Now taking bookings for winter Sunday lunches",
  primaryCta: { label: "Book a table", href: "/book" },
  pages: [
    { slug: "", nav: "Home", title: "Seasonal seafood by the harbour", description: "Harbour Kitchen serves seasonal seafood and vegetables from local boats and growers. Book a table, see the menu or plan a private dinner.",
      seo: { keywords: ["seafood restaurant", "seasonal menu", "harbour restaurant", "book a table"] },
      sections: [
        { t: "hero", v: "full", eyebrow: "Open Wednesday to Sunday", title: "Today's catch, cooked simply", sub: "A small dining room on the quay serving what the boats and nearby growers bring in each morning. The menu changes as the seasons do.", ctas: [{ label: "Book a table", href: "/book" }, { label: "See the menu", href: "/menu" }], img: { art: "dish", alt: "Plated seared fish with greens and a bright sauce", seed: 2 } },
        { t: "features", title: "What to expect", items: [
          { icon: "leaf", title: "Led by the season", body: "We write the menu around what's good this week, so dishes come and go. Ask us what came in this morning." },
          { icon: "cup", title: "A considered wine list", body: "Mostly small European producers, with plenty by the glass and a non-alcoholic pairing that's just as thoughtful." },
          { icon: "users", title: "Tables for two to twenty", body: "Cosy corners for a quiet dinner, a long table for celebrations, and the whole room for private events." },
        ] },
        { t: "split", eyebrow: "Our kitchen", title: "Simple cooking, done with care", body: ["Our cooking is about letting good produce speak for itself: fish cooked over fire, vegetables at their peak, sauces made from scratch each day.", "We bake our own bread, cure our own fish and make our ice creams in-house. If something isn't right, it doesn't go out."], img: { art: "chef", alt: "Chef plating dishes at the pass in an open kitchen" }, cta: { label: "Read our story", href: "/about" } },
        { t: "menu", title: "A taste of this week's menu", sub: "Prices include VAT. A discretionary 12.5% service charge is added for tables of six or more.", groups: [
          { name: "To start", items: [
            { name: "Grilled sourdough, cultured butter", desc: "Baked here every morning", price: "£5" },
            { name: "Cured trout, beetroot, horseradish", desc: "Dill oil, pickled shallot", price: "£11" },
          ] },
          { name: "Mains", items: [
            { name: "Fish of the day over fire", desc: "Brown butter, capers, charred lemon", price: "£26" },
            { name: "Roast squash, whipped feta, chilli honey", desc: "Toasted seeds, sage", price: "£18", tags: ["V"] },
          ] },
        ] },
        { t: "gallery", title: "Inside the dining room", items: [
          { art: "dining-room", alt: "Warmly lit dining room with pendant lights" }, { art: "drinks", alt: "Three cocktails on the bar" }, { art: "dish", alt: "A shared plate of seafood", seed: 5 }, { art: "chef", alt: "The kitchen team at work", seed: 3 }, { art: "dish", alt: "Dessert with seasonal fruit", seed: 9 },
        ] },
        { t: "testimonials", sample: true, title: "Kind words", items: [
          { quote: "The fish was cooked perfectly and the staff made our anniversary feel special.", name: "Guest review", role: "Replace with a real review" },
          { quote: "A relaxed room, a short menu that changes often, and lovely wine by the glass.", name: "Guest review", role: "Replace with a real review" },
          { quote: "We booked the long table for a birthday and everything was taken care of.", name: "Guest review", role: "Replace with a real review" },
        ] },
        { t: "cta", title: "Join us this week", sub: "Book online in a minute, or call us for tables of more than eight.", ctas: [{ label: "Book a table", href: "/book" }, { label: "Private dining", href: "/private-dining" }], img: { art: "dining-room", alt: "Set tables waiting for guests", seed: 4 } },
      ] },
    { slug: "menu", nav: "Menu", title: "Menu", description: "This week's dinner menu at Harbour Kitchen: seasonal seafood, vegetables, desserts and drinks.",
      seo: { keywords: ["restaurant menu", "seafood menu", "vegetarian dishes"] },
      sections: [
        { t: "hero", v: "center", eyebrow: "Dinner · Wednesday to Sunday", title: "This week's menu", sub: "Our menu changes with the catch and the season. Vegetarian and vegan dishes are marked; tell us about allergies and we'll guide you through it.", ctas: [{ label: "Book a table", href: "/book" }] },
        { t: "menu", title: "Dinner", groups: [
          { name: "Snacks", items: [
            { name: "Grilled sourdough, cultured butter", desc: "Baked every morning", price: "£5", tags: ["V"] },
            { name: "Smoked mackerel croquettes", desc: "Lemon mayonnaise", price: "£7" },
            { name: "Crispy potatoes, rosemary salt", desc: "Garlic aioli", price: "£6", tags: ["V"] },
          ] },
          { name: "Small plates", items: [
            { name: "Cured trout, beetroot, horseradish", desc: "Dill oil, pickled shallot", price: "£11" },
            { name: "Mussels, cider, leeks", desc: "Served with bread for the sauce", price: "£12" },
            { name: "Charred hispi cabbage", desc: "Miso butter, toasted hazelnuts", price: "£9", tags: ["V"] },
          ] },
          { name: "Mains", items: [
            { name: "Fish of the day over fire", desc: "Brown butter, capers, charred lemon", price: "£26" },
            { name: "Hake, white beans, salsa verde", desc: "Slow-cooked beans, wild garlic", price: "£24" },
            { name: "Roast squash, whipped feta, chilli honey", desc: "Toasted seeds, sage", price: "£18", tags: ["V"] },
          ] },
          { name: "Desserts", items: [
            { name: "Brown butter tart", desc: "Crème fraîche", price: "£8", tags: ["V"] },
            { name: "House ice creams", desc: "Ask for today's flavours", price: "£6", tags: ["V"] },
          ] },
        ] },
        { t: "split", title: "Drinks", body: ["Our list leans towards small producers making honest wine. Around half the list is available by the glass or carafe.", "Prefer not to drink? Our non-alcoholic pairing uses house-made shrubs, ferments and teas."], bullets: ["Wine by the glass and carafe", "Local beer and cider", "Non-alcoholic pairing"], img: { art: "drinks", alt: "Glasses of wine and cocktails on the bar" }, reverse: true },
      ] },
    { slug: "book", nav: "Book", title: "Book a table", description: "Request a table at Harbour Kitchen for lunch or dinner.", inNav: false,
      sections: [
        { t: "booking", kind: "table", title: "Book a table", sub: "Choose a date and time and we'll confirm your table by email. For eight or more guests, see private dining.", fields: [
          { label: "Date", type: "date" }, { label: "Time", type: "select", options: ["12:00", "12:30", "13:00", "13:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"] },
          { label: "Guests", type: "select", options: ["1", "2", "3", "4", "5", "6", "7", "8"] }, { label: "Name", type: "text" }, { label: "Email", type: "email" }, { label: "Phone", type: "tel" },
        ], button: "Request table", aside: ["We hold tables for 15 minutes", "Tell us about allergies when you book", "Free cancellation up to 24 hours before"] },
        { t: "faq", title: "Good to know", items: [
          ["Do you take walk-ins?", "Yes — we keep a few tables and bar seats for walk-ins each evening, first come, first served."],
          ["Can you cater for allergies?", "We can adapt most dishes. Please mention allergies when you book and remind your server on the day."],
          ["Is there step-free access?", "Yes, the dining room and an accessible toilet are on the ground floor."],
          ["Are children welcome?", "Always. We have high chairs and a smaller version of most dishes."],
        ] },
      ] },
    { slug: "private-dining", nav: "Private dining", title: "Private dining and events", description: "Host a celebration, team dinner or wedding meal at Harbour Kitchen.",
      sections: [
        { t: "hero", v: "split", eyebrow: "Private dining", title: "Your occasion, our long table", sub: "From a birthday for twelve to exclusive use of the restaurant, we'll shape a menu around your group and look after every detail.", ctas: [{ label: "Make an enquiry", href: "#book" }], img: { art: "dining-room", alt: "Long table set for a private dinner", seed: 7 } },
        { t: "cards", v: "service", title: "Ways to celebrate", items: [
          { title: "The long table", meta: "Up to 20 guests", body: "A semi-private space in the main room with a set sharing menu.", price: "From [[price:minimum spend]]" },
          { title: "Exclusive use", meta: "Up to 60 guests", body: "The whole restaurant, with a menu and drinks designed with you.", price: "From [[price:minimum spend]]" },
          { title: "Daytime gatherings", meta: "Up to 40 guests", body: "Weekday lunches, launches and wakes, with flexible timings.", price: "From [[price:minimum spend]]" },
        ] },
        { t: "booking", kind: "visit", title: "Tell us about your event", sub: "Share a few details and our events team will reply with menus and availability within two working days.", fields: [
          { label: "Preferred date", type: "date" }, { label: "Number of guests", type: "number" }, { label: "Occasion", type: "select", options: ["Birthday", "Anniversary", "Work dinner", "Wedding", "Other"] }, { label: "Name", type: "text" }, { label: "Email", type: "email" }, { label: "Phone", type: "tel" },
        ], button: "Send enquiry", aside: ["Set menus or sharing feasts", "Wine pairing on request", "Dietary needs handled with care"] },
      ] },
    { slug: "about", nav: "Our story", title: "Our story", description: "Who we are, where our food comes from and how we cook at Harbour Kitchen.",
      sections: [
        { t: "hero", v: "editorial", eyebrow: "Our story", title: "A small restaurant with a short supply chain", sub: "We started Harbour Kitchen to cook the kind of food we love to eat: honest, seasonal and generous. Most of what we serve travels less than an hour to reach us.", ctas: [], img: { art: "chef", alt: "Chef tasting a sauce", seed: 6 } },
        { t: "split", title: "Where our food comes from", body: ["We buy fish directly from day boats landing nearby, so what we serve depends on the weather and the season. Vegetables come from growers we know by name.", "When something runs out, it's off the menu — we'd rather that than compromise."], bullets: ["Day-boat fish, never frozen", "Vegetables from nearby growers", "Bread, ice cream and cures made in-house"], img: { art: "river", alt: "Coastal landscape near the restaurant" } },
        { t: "team", title: "The people behind the pass", items: [{ name: "[[name:head chef name]]", role: "Head chef" }, { name: "[[name:general manager name]]", role: "General manager" }, { name: "[[name:sommelier name]]", role: "Wine and drinks" }, { name: "[[name:pastry chef name]]", role: "Pastry" }] },
      ] },
    contactPage({ title: "Find us on the quay", sub: "Questions about bookings, allergies or gift vouchers? Send us a message and we'll reply within a day.", description: "Opening hours, address and contact details for Harbour Kitchen.", hours: [["Wed – Thu", "17:30 – 22:00"], ["Fri – Sat", "12:00 – 15:00, 17:30 – 22:30"], ["Sunday", "12:00 – 17:00"], ["Mon – Tue", "Closed"]] }),
    ...legalPages("Harbour Kitchen"),
  ],
  footer: footer({
    blurb: "Seasonal seafood and vegetables, cooked simply, in a small dining room on the quay.",
    columns: [
      { title: "Visit", links: [{ label: "Menu", href: "/menu" }, { label: "Book a table", href: "/book" }, { label: "Private dining", href: "/private-dining" }] },
      { title: "About", links: [{ label: "Our story", href: "/about" }, { label: "Contact", href: "/contact" }] },
    ],
    social: ["instagram", "facebook"], newsletter: { title: "News from the kitchen", button: "Sign up" }, legalName: "Harbour Kitchen",
  }),
};

export const wayfarer: Site = {
  slug: "wayfarer-journeys", name: "Tour operator site with trips & enquiries", category: "Travel & Tourism", style: "Bright and airy", voice: "friendly",
  tagline: "Small-group tour operator with trip pages, dates and enquiries.",
  description: "A travel company site with destination tours, detailed itineraries, departure dates, a planning guide and an enquiry form — for tour operators and travel planners.",
  palette: { bg: "#f6fafb", surface: "#ffffff", ink: "#12313d", muted: "#557079", accent: "#0f8a8a", accent2: "#f2a541", soft: "#e2f2f1", line: "#d6e6e8", onAccent: "#ffffff" },
  fonts: { display: "grotesk", body: "sans" }, logo: { mark: "arch", word: "Wayfarer" }, radius: "round",
  primaryCta: { label: "Plan a trip", href: "/contact" },
  pages: [
    { slug: "", nav: "Home", title: "Small-group journeys, thoughtfully planned", description: "Small-group tours with local guides, comfortable stays and time to explore. Browse trips, dates and itineraries.",
      seo: { keywords: ["small group tours", "guided trips", "walking holidays", "tour operator"] },
      sections: [
        { t: "hero", v: "search", eyebrow: "Small groups · Local guides", title: "Travel slower. See more.", sub: "Guided journeys for up to 14 travellers, with time built in to wander, rest and meet the people who live there.", ctas: [{ label: "Search trips", href: "/trips" }], search: { placeholder: "Where would you like to go?", fields: ["Month", "Trip style"] }, img: { art: "mountain", alt: "Mountain range at sunrise" } },
        { t: "cards", v: "tour", title: "Journeys to start with", more: { label: "All trips", href: "/trips" }, items: [
          { title: "Coastal villages on foot", meta: "8 days · Moderate walking", body: "Clifftop paths, fishing harbours and long lunches.", price: "From [[price:trip price]]", img: { art: "beach", alt: "Coastal path above a beach" }, href: "/trips/coastal-villages", tags: ["Walking", "Coast"] },
          { title: "Old towns and markets", meta: "10 days · Easy pace", body: "Historic centres, cooking classes and train journeys.", price: "From [[price:trip price]]", img: { art: "old-town", alt: "Colourful old-town street" }, href: "/trips/coastal-villages", tags: ["Culture", "Food"] },
          { title: "High valleys and lakes", meta: "9 days · Active", body: "Mountain huts, lake swims and big skies.", price: "From [[price:trip price]]", img: { art: "mountain", alt: "Lake below mountains", seed: 4 }, href: "/trips/coastal-villages", tags: ["Hiking", "Mountains"] },
        ] },
        { t: "features", title: "How we travel", items: [
          { icon: "users", title: "Groups of 14 or fewer", body: "Small enough to stay in family-run places and be welcomed, not processed." },
          { icon: "pin", title: "Local guides", body: "Every trip is led by someone who lives in the region and knows its stories." },
          { icon: "clock", title: "Unhurried days", body: "Free afternoons and flexible mornings, so the trip has room to breathe." },
          { icon: "shield", title: "Protected bookings", body: "Your booking is protected under [[licence:travel protection scheme and number]]." },
        ], cols: 4 },
        { t: "split", title: "Not sure where to start?", body: ["Tell us how you like to travel and when you're free. We'll suggest two or three trips that fit, with honest notes on pace and comfort."], bullets: ["Advice from people who've done the trips", "Clear notes on walking distances", "Solo travellers always welcome"], img: { art: "plane", alt: "Plane above the clouds" }, cta: { label: "Talk to a trip planner", href: "/contact" } },
        { t: "testimonials", sample: true, title: "From recent travellers", items: [
          { quote: "The guide made the trip — we felt like guests, not tourists.", name: "Traveller review", role: "Replace with a real review" },
          { quote: "Exactly the right balance of plans and free time.", name: "Traveller review", role: "Replace with a real review" },
        ] },
        { t: "newsletter", title: "New trips and departure dates", sub: "One email a month with new journeys and places that are filling up.", button: "Subscribe" },
      ] },
    { slug: "trips", nav: "Trips", title: "All trips", description: "Browse every Wayfarer journey by region, style and pace.",
      sections: [
        { t: "hero", v: "center", eyebrow: "All journeys", title: "Find your next trip", sub: "Every trip is graded for pace so you know what to expect before you book.", ctas: [] },
        { t: "cards", v: "tour", title: "Trips", filters: ["All", "Walking", "Culture", "Food", "Mountains", "Coast"], items: [
          { title: "Coastal villages on foot", meta: "8 days · Moderate", price: "From [[price:trip price]]", img: { art: "beach", alt: "Coastal path", seed: 3 }, href: "/trips/coastal-villages", tags: ["Walking"] },
          { title: "Old towns and markets", meta: "10 days · Easy", price: "From [[price:trip price]]", img: { art: "old-town", alt: "Old town square", seed: 5 }, href: "/trips/coastal-villages", tags: ["Culture"] },
          { title: "High valleys and lakes", meta: "9 days · Active", price: "From [[price:trip price]]", img: { art: "mountain", alt: "Alpine lake", seed: 6 }, href: "/trips/coastal-villages", tags: ["Mountains"] },
          { title: "Islands by ferry", meta: "12 days · Easy", price: "From [[price:trip price]]", img: { art: "beach", alt: "Island harbour", seed: 8 }, href: "/trips/coastal-villages", tags: ["Coast"] },
          { title: "Rivers and vineyards", meta: "7 days · Easy", price: "From [[price:trip price]]", img: { art: "river", alt: "River through vineyards" }, href: "/trips/coastal-villages", tags: ["Food"] },
          { title: "City breaks with a guide", meta: "5 days · Easy", price: "From [[price:trip price]]", img: { art: "skyline", alt: "City skyline at dusk" }, href: "/trips/coastal-villages", tags: ["Culture"] },
        ] },
      ] },
    { slug: "trips/coastal-villages", nav: "Coastal villages", inNav: false, title: "Coastal villages on foot", description: "An eight-day guided walking trip along a coastline of fishing villages and clifftop paths.",
      sections: [
        { t: "detail", v: "tour", title: "Coastal villages on foot", sub: "Eight days walking between harbour villages, with luggage moved for you and every night in a family-run guesthouse.", img: { art: "beach", alt: "Clifftop path above the sea", seed: 2 }, gallery: [{ art: "old-town", alt: "Harbour village" }, { art: "dish", alt: "Seafood lunch", seed: 3 }, { art: "mountain", alt: "Coastal hills", seed: 2 }, { art: "river", alt: "Estuary", seed: 2 }], price: "From [[price:trip price]] per person", facts: [["Duration", "8 days, 7 nights"], ["Group size", "Up to 14"], ["Pace", "Moderate · 10–16 km a day"], ["Stays", "Family-run guesthouses"], ["Included", "Breakfasts, 4 dinners, guide, luggage transfers"]], body: ["Each day follows a section of the coast path, finishing in a different village. Your luggage travels ahead, so you carry only a day pack.", "Afternoons are free for swimming, reading or exploring. Two evenings are spent together at restaurants your guide loves."], highlights: ["Boat trip to a sea-cave coast", "Cooking class with a local family", "A rest day in the prettiest harbour"], cta: { label: "Check dates", href: "#book" }, secondary: { label: "Ask a question", href: "/contact" } },
        { t: "timeline", title: "Day by day", items: [
          { year: "Day 1", title: "Arrive and settle in", body: "Meet your group for a welcome dinner by the harbour." },
          { year: "Days 2–3", title: "Clifftops and coves", body: "Two days of walking with swims in sheltered coves along the way." },
          { year: "Day 4", title: "A day off", body: "Rest, explore, or join the optional boat trip." },
          { year: "Days 5–7", title: "Villages and vineyards", body: "Inland paths, a cooking class and a farewell dinner." },
          { year: "Day 8", title: "Depart", body: "Transfers to the station after breakfast." },
        ] },
        { t: "booking", kind: "tour", title: "Choose a departure", sub: "Pick a date and we'll confirm availability and send the full trip notes.", fields: [{ label: "Departure", type: "select", options: ["Spring departure", "Early summer departure", "Autumn departure"] }, { label: "Travellers", type: "number" }, { label: "Room", type: "select", options: ["Twin", "Double", "Single"] }, { label: "Name", type: "text" }, { label: "Email", type: "email" }, { label: "Phone", type: "tel" }], button: "Check availability", aside: ["No payment taken until we confirm", "Single rooms available", "Full trip notes sent by email"] },
      ] },
    { slug: "guide", nav: "Planning guide", title: "Trip planning guide", description: "How to choose a trip, what our pace grades mean, and what's included.",
      sections: [
        { t: "hero", v: "center", eyebrow: "Planning guide", title: "Choosing the right trip", sub: "A quick guide to pace, comfort and what's included, so there are no surprises.", ctas: [] },
        { t: "rates", title: "What our pace grades mean", cols: ["Grade", "Daily activity", "Who it suits"], rows: [["Easy", "Up to 8 km of gentle walking", "Anyone who enjoys a stroll"], ["Moderate", "10–16 km with some hills", "Regular walkers"], ["Active", "15–22 km with steep sections", "Experienced hikers"]], note: "Not sure? Ask us — we'll be honest about whether a trip suits you." },
        { t: "faq", title: "Common questions", items: [
          ["Are flights included?", "No. We include everything from the start point to the end point, and we're happy to suggest the best routes to get there."],
          ["Can I travel solo?", "Yes — many of our travellers do. Single rooms are available on every trip."],
          ["What if I need to cancel?", "Our booking conditions explain cancellation charges in plain English. We strongly recommend travel insurance."],
          ["How is my booking protected?", "Bookings are protected under [[licence:travel protection scheme and number]]."],
        ] },
      ] },
    contactPage({ title: "Talk to a trip planner", sub: "Tell us where you'd like to go and when. We reply to every enquiry personally, usually within one working day.", description: "Contact Wayfarer Journeys to plan a trip or ask about departures.", fields: ["Your name", "Email", "Phone (optional)", "Where and when would you like to travel?"], hours: [["Mon – Fri", "09:00 – 18:00"], ["Saturday", "10:00 – 14:00"]] }),
    ...legalPages("Wayfarer Journeys", { extra: ["Booking information: when you book, we share the names and any dietary or access needs of travellers with the guides and guesthouses on your trip, only so they can look after you."] }),
  ],
  footer: footer({
    blurb: "Small-group journeys with local guides and time to explore.",
    columns: [
      { title: "Trips", links: [{ label: "All trips", href: "/trips" }, { label: "Coastal villages", href: "/trips/coastal-villages" }, { label: "Planning guide", href: "/guide" }] },
      { title: "Company", links: [{ label: "Contact", href: "/contact" }, { label: "Privacy", href: "/privacy" }] },
    ],
    social: ["instagram", "facebook", "youtube"], newsletter: { title: "Trip news", button: "Subscribe" }, legalName: "Wayfarer Journeys", reg: "[[licence:travel protection scheme and number]]",
  }),
};

export const summit: Site = {
  slug: "summit-2027", name: "Event site with schedule & tickets", category: "Events", style: "Bold and electric", voice: "bold",
  tagline: "Conference site with speakers, schedule, tickets and venue information.",
  description: "A two-day conference site with speakers, a full schedule, ticket tiers, venue and travel details, sponsorship packages and an FAQ — for conferences, festivals and meetups.",
  palette: { bg: "#0f0e17", surface: "#1b1a27", ink: "#fffffe", muted: "#a7a9be", accent: "#ff6e6c", accent2: "#7f5af0", soft: "#272538", line: "#2e2c40", onAccent: "#0f0e17" },
  fonts: { display: "grotesk", body: "sans" }, logo: { mark: "diamond", word: "Summit 27" }, radius: "soft",
  announcement: "Early tickets available until [[date:early-ticket deadline]]",
  primaryCta: { label: "Get tickets", href: "/tickets" },
  pages: [
    { slug: "", nav: "Home", title: "Two days of ideas worth acting on", description: "Summit 2027 brings together builders, designers and founders for two days of talks, workshops and conversations.",
      seo: { keywords: ["conference 2027", "tech conference", "design conference", "event tickets"] },
      sections: [
        { t: "hero", v: "split", eyebrow: "[[date:event dates]] · [[venue:city]]", title: "Two days of ideas worth acting on", sub: "Talks, hands-on workshops and long breaks designed for real conversations. Leave with plans, not just notes.", ctas: [{ label: "Get tickets", href: "/tickets" }, { label: "See the schedule", href: "/schedule" }], img: { art: "stage", alt: "Speaker on a lit conference stage" }, stats: [["2", "days"], ["3", "stages"], ["12", "workshops"]] },
        { t: "features", title: "What's on", items: [
          { icon: "spark", title: "Main-stage talks", body: "Short, practical talks from people who've shipped the thing they're talking about." },
          { icon: "tool", title: "Workshops", body: "Small, hands-on sessions. Bring a laptop and leave with something built." },
          { icon: "chat", title: "Hallway track", body: "Long breaks, quiet rooms and hosted tables, so you meet the right people." },
        ] },
        { t: "cards", v: "person", title: "Speakers", sub: "The full line-up is announced as speakers confirm.", more: { label: "All speakers", href: "/speakers" }, cols: 4, items: [
          { title: "[[name:speaker name]]", meta: "Design lead · Opening keynote", img: { art: "portrait", alt: "Speaker portrait illustration", seed: 2 } },
          { title: "[[name:speaker name]]", meta: "Founder · Building small teams", img: { art: "portrait", alt: "Speaker portrait illustration", seed: 5 } },
          { title: "[[name:speaker name]]", meta: "Engineer · Shipping weekly", img: { art: "portrait", alt: "Speaker portrait illustration", seed: 8 } },
          { title: "[[name:speaker name]]", meta: "Researcher · Products people love", img: { art: "portrait", alt: "Speaker portrait illustration", seed: 11 } },
        ] },
        { t: "split", title: "A venue built for conversation", body: ["Three stages, workshop rooms and a big central hall for coffee and lunch — all step-free and a short walk from the station."], img: { art: "venue", alt: "Conference venue exterior" }, cta: { label: "Venue and travel", href: "/venue" }, reverse: true },
        { t: "logos", sample: true, title: "Supported by", items: ["Northwind", "Brightline", "Orbit", "Kindred", "Fieldwork"] },
        { t: "cta", title: "Join us in [[venue:city]]", sub: "Tickets include both days, lunch and the evening social.", ctas: [{ label: "Get tickets", href: "/tickets" }, { label: "Become a sponsor", href: "/sponsors" }] },
      ] },
    { slug: "speakers", nav: "Speakers", title: "Speakers", description: "Meet the speakers and workshop leaders at Summit 2027.",
      sections: [
        { t: "hero", v: "center", eyebrow: "Line-up", title: "Speakers and workshop leaders", sub: "More names are announced every month. Subscribe to hear first.", ctas: [{ label: "Apply to speak", href: "/contact" }] },
        { t: "cards", v: "person", title: "Confirmed so far", cols: 4, items: Array.from({ length: 8 }, (_, i) => ({ title: "[[name:speaker name]]", meta: ["Opening keynote", "Workshop: rapid prototyping", "Panel: small teams", "Talk: accessible by default", "Workshop: writing for interfaces", "Talk: pricing your product", "Panel: AI in practice", "Closing keynote"][i], img: { art: "portrait" as const, alt: "Speaker portrait illustration", seed: i * 3 + 1 } })) },
      ] },
    { slug: "schedule", nav: "Schedule", title: "Schedule", description: "The full Summit 2027 programme across both days and all stages.",
      sections: [
        { t: "schedule", title: "Programme", days: [
          { day: "Day one", sessions: [
            { time: "08:30", title: "Registration and breakfast", who: "Central hall", room: "Hall" },
            { time: "09:30", title: "Opening keynote: building with intent", who: "[[name:speaker name]]", room: "Main stage" },
            { time: "11:00", title: "Workshop: rapid prototyping", who: "[[name:workshop lead]]", room: "Studio A" },
            { time: "13:00", title: "Lunch and hosted tables", who: "Pick a topic table", room: "Hall" },
            { time: "14:30", title: "Panel: small teams, big products", who: "Three founders", room: "Main stage" },
            { time: "18:00", title: "Evening social", who: "Food, music and good company", room: "Terrace" },
          ] },
          { day: "Day two", sessions: [
            { time: "09:00", title: "Talk: accessible by default", who: "[[name:speaker name]]", room: "Main stage" },
            { time: "10:30", title: "Workshop: writing for interfaces", who: "[[name:workshop lead]]", room: "Studio B" },
            { time: "13:00", title: "Lunch", who: "Central hall", room: "Hall" },
            { time: "16:00", title: "Closing keynote", who: "[[name:speaker name]]", room: "Main stage" },
          ] },
        ] },
      ] },
    { slug: "tickets", nav: "Tickets", title: "Tickets", description: "Ticket options for Summit 2027, including group and student tickets.",
      sections: [
        { t: "pricing", title: "Tickets", sub: "All tickets include both days, lunch, refreshments and the evening social.", plans: [
          { name: "Early", price: "[[price:early ticket price]]", per: "per person", blurb: "Limited early tickets.", features: ["Both days", "Lunch and refreshments", "Evening social", "Session recordings"], cta: { label: "Choose Early", href: "#book" } },
          { name: "Standard", price: "[[price:standard ticket price]]", per: "per person", blurb: "The full conference.", features: ["Both days", "Workshop booking", "Lunch and refreshments", "Evening social", "Session recordings"], cta: { label: "Choose Standard", href: "#book" }, featured: true },
          { name: "Team of five", price: "[[price:team price]]", per: "per team", blurb: "Bring your team.", features: ["Five Standard tickets", "Reserved team table", "One invoice"], cta: { label: "Choose Team", href: "#book" } },
        ] },
        { t: "booking", kind: "ticket", title: "Reserve your tickets", sub: "Choose a ticket type and quantity. You'll pay securely on the next step.", fields: [{ label: "Ticket", type: "select", options: ["Early", "Standard", "Team of five", "Student"] }, { label: "Quantity", type: "number" }, { label: "Name", type: "text" }, { label: "Email", type: "email" }], button: "Continue", aside: ["Name changes free until a week before", "Student and access tickets available", "Invoices for companies"] },
      ] },
    { slug: "venue", nav: "Venue", title: "Venue and travel", description: "Getting to the Summit 2027 venue, accessibility and nearby stays.",
      sections: [
        { t: "split", title: "Getting there", body: ["The venue is [[venue]], a short walk from the main station. Bike parking is available on site.", "There's no on-site car parking; we recommend public transport."], bullets: ["Step-free access throughout", "Quiet room and prayer room", "Live captions on the main stage"], img: { art: "map", alt: "Map of the venue area" } },
        { t: "faq", title: "Accessibility and practical details", items: [["Is the venue accessible?", "Yes — step-free throughout, with accessible toilets on every floor and reserved seating at each stage."], ["Will talks be recorded?", "Main-stage talks are recorded and shared with ticket holders after the event."], ["Is food included?", "Lunch and refreshments are included on both days, with vegetarian, vegan and allergy-friendly options."]] },
      ] },
    { slug: "sponsors", nav: "Sponsors", title: "Sponsorship", description: "Sponsorship packages for Summit 2027.",
      sections: [
        { t: "hero", v: "center", eyebrow: "Partners", title: "Sponsor Summit 2027", sub: "Meet the people building what's next, with packages designed around useful presence — not banner noise.", ctas: [{ label: "Request the sponsor pack", href: "/contact" }] },
        { t: "cards", v: "service", title: "Packages", items: [{ title: "Community partner", body: "Logo on the site, two tickets and a hosted lunch table.", price: "[[price:package price]]" }, { title: "Workshop partner", body: "Host a workshop room, four tickets and a stand.", price: "[[price:package price]]" }, { title: "Headline partner", body: "Main-stage introduction, eight tickets and the evening social.", price: "[[price:package price]]" }] },
      ] },
    contactPage({ title: "Get in touch", sub: "Questions about tickets, speaking or sponsorship? We'll get back to you within two working days.", description: "Contact the Summit 2027 team.", fields: ["Your name", "Email", "Company (optional)", "Your question"] }),
    ...legalPages("Summit 2027", { extra: ["Event data: if you buy a ticket, we use your name and company for your badge and share them with sponsors only if you choose to have your badge scanned."] }),
  ],
  footer: footer({
    blurb: "Two days of talks, workshops and conversations for people who build.",
    columns: [
      { title: "Event", links: [{ label: "Speakers", href: "/speakers" }, { label: "Schedule", href: "/schedule" }, { label: "Tickets", href: "/tickets" }, { label: "Venue", href: "/venue" }] },
      { title: "Get involved", links: [{ label: "Sponsors", href: "/sponsors" }, { label: "Contact", href: "/contact" }] },
    ],
    social: ["x", "linkedin", "youtube"], newsletter: { title: "Line-up news", button: "Subscribe" }, legalName: "Summit 2027",
    contact: [["Email", "[[email]]"], ["Venue", "[[venue]]"]],
  }),
};
