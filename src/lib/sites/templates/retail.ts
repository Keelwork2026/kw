import type { Card, Site } from "../types";
import { contactPage, footer, legalPages } from "../common";

export const maisonVale: Site = {
  slug: "maison-vale", name: "Maison Vale", category: "Fashion & Beauty", style: "Quiet luxury", voice: "luxury",
  tagline: "Fashion label with lookbook, collections, journal and appointments.",
  description: "A fashion and beauty brand site with seasonal collections, a lookbook, product pages, a journal, atelier appointments and stockists — for labels, boutiques and studios.",
  palette: { bg: "#f4efe9", surface: "#fbf8f4", ink: "#2a2420", muted: "#776a60", accent: "#8a5a44", accent2: "#c7a17a", soft: "#ebe1d6", line: "#ddd1c4", onAccent: "#fbf8f4" },
  fonts: { display: "serif", body: "sans" }, logo: { mark: "arch", word: "Maison Vale" }, radius: "none",
  announcement: "Complimentary alterations on every atelier order",
  primaryCta: { label: "Book an appointment", href: "/atelier" },
  pages: [
    { slug: "", nav: "Home", title: "Considered clothing, made to last", description: "Maison Vale designs timeless womenswear in natural fabrics, made in small runs. Explore the collection or book an atelier appointment.",
      seo: { keywords: ["womenswear label", "timeless clothing", "natural fabrics", "atelier appointment"] },
      sections: [
        { t: "hero", v: "editorial", eyebrow: "Autumn / Winter collection", title: "Clothes you'll reach for every season", sub: "Wool, linen and silk, cut simply and made in small runs by workshops we know well.", ctas: [{ label: "Explore the collection", href: "/collection" }, { label: "View the lookbook", href: "/lookbook" }], img: { art: "model", alt: "Model wearing a tailored coat from the collection" } },
        { t: "cards", v: "product", title: "New this season", more: { label: "Shop all", href: "/collection" }, cols: 4, items: [
          { title: "Wool wrap coat", meta: "Camel", price: "[[price]]", img: { art: "dress", alt: "Wool wrap coat", seed: 2 }, href: "/collection/wrap-coat" },
          { title: "Silk slip dress", meta: "Ink", price: "[[price]]", img: { art: "dress", alt: "Silk slip dress", seed: 5 }, href: "/collection/wrap-coat" },
          { title: "Leather tote", meta: "Tan", price: "[[price]]", img: { art: "bag", alt: "Leather tote bag" }, href: "/collection/wrap-coat" },
          { title: "Leather ankle boot", meta: "Chestnut", price: "[[price]]", img: { art: "shoe", alt: "Ankle boot" }, href: "/collection/wrap-coat" },
        ] },
        { t: "split", eyebrow: "Our approach", title: "Fewer pieces, better made", body: ["We release two small collections a year and keep our best pieces in production season after season.", "Each garment lists its fabric, its maker and how to care for it, so it lasts."], bullets: ["Natural and recycled fibres", "Small-run production", "Free repairs in the first year"], img: { art: "rack", alt: "Clothing rail in the studio" }, cta: { label: "About the studio", href: "/about" } },
        { t: "gallery", title: "From the lookbook", items: [{ art: "model", alt: "Look one", seed: 3 }, { art: "dress", alt: "Look two", seed: 7 }, { art: "bag", alt: "Look three", seed: 4 }, { art: "model", alt: "Look four", seed: 9 }, { art: "shoe", alt: "Look five", seed: 3 }] },
        { t: "newsletter", title: "Hear about new pieces first", sub: "Collection previews and studio news, a few times a season.", button: "Subscribe" },
      ] },
    { slug: "collection", nav: "Collection", title: "The collection", description: "Shop the Maison Vale collection: coats, dresses, knitwear and accessories.",
      sections: [
        { t: "cards", v: "product", title: "The collection", filters: ["All", "Coats", "Dresses", "Knitwear", "Accessories"], cols: 4, items: [
          ["Wool wrap coat", "dress", 2], ["Silk slip dress", "dress", 5], ["Merino crew jumper", "rack", 3], ["Linen wide trousers", "dress", 8], ["Leather tote", "bag", 1], ["Leather ankle boot", "shoe", 1], ["Cashmere scarf", "rack", 6], ["Pleated midi skirt", "dress", 11],
        ].map(([t, a, s]) => ({ title: t as string, price: "[[price]]", img: { art: a as "dress", alt: t as string, seed: s as number }, href: "/collection/wrap-coat" })) },
      ] },
    { slug: "collection/wrap-coat", nav: "Wool wrap coat", inNav: false, title: "Wool wrap coat", description: "A relaxed wrap coat in recycled wool, made in small runs.",
      sections: [
        { t: "detail", v: "product", title: "Wool wrap coat", sub: "A relaxed wrap coat with deep pockets and a tie belt, cut from recycled wool for warmth without bulk.", img: { art: "dress", alt: "Wool wrap coat, front view", seed: 2 }, gallery: [{ art: "model", alt: "Coat worn", seed: 4 }, { art: "dress", alt: "Back view", seed: 3 }, { art: "rack", alt: "Fabric detail", seed: 2 }, { art: "bag", alt: "Styled with tote", seed: 3 }], price: "[[price]]", options: { name: "Size", values: ["XS", "S", "M", "L", "XL"] }, facts: [["Fabric", "Recycled wool blend"], ["Made in", "[[maker:workshop location]]"], ["Fit", "Relaxed; take your usual size"], ["Care", "Dry clean or air and steam"]], body: ["Unlined for an easy drape, with French seams inside so it looks as good open as closed."], highlights: ["Free returns within 30 days", "Free repairs in the first year"], cta: { label: "Add to basket", href: "/contact" } },
      ] },
    { slug: "lookbook", nav: "Lookbook", title: "Lookbook", description: "The Maison Vale lookbook for this season.",
      sections: [
        { t: "hero", v: "center", eyebrow: "Lookbook", title: "Autumn / Winter", sub: "Layered neutrals, soft tailoring and pieces made to be worn together.", ctas: [{ label: "Shop the looks", href: "/collection" }] },
        { t: "gallery", title: "The looks", items: Array.from({ length: 10 }, (_, i) => ({ art: (["model", "dress", "bag", "shoe", "rack"] as const)[i % 5]!, alt: `Look ${i + 1}`, seed: i + 2 })) },
      ] },
    { slug: "journal", nav: "Journal", title: "Journal", description: "Stories from the studio: makers, materials and care guides.",
      sections: [{ t: "cards", v: "article", title: "Journal", items: [
        { title: "How to care for wool", meta: "Care guide", body: "Air it, brush it, steam it — and it will last for years.", img: { art: "rack", alt: "Knitwear folded", seed: 9 } },
        { title: "Visiting our knitwear workshop", meta: "Makers", body: "A day with the family workshop that makes our jumpers.", img: { art: "hands", alt: "Hands at work" } },
        { title: "Why we make less", meta: "Studio", body: "Two collections a year, and why that suits everyone.", img: { art: "notebook", alt: "Sketchbook" } },
      ] }] },
    { slug: "atelier", nav: "Atelier", title: "Atelier appointments", description: "Book a private styling or fitting appointment at the Maison Vale atelier.",
      sections: [
        { t: "booking", kind: "appointment", title: "Book an atelier appointment", sub: "A private hour to try the collection, with fitting advice and alterations available.", fields: [{ label: "Date", type: "date" }, { label: "Time", type: "select", options: ["10:00", "11:30", "13:00", "14:30", "16:00"] }, { label: "Appointment", type: "select", options: ["Styling", "Fitting", "Bridal"] }, { label: "Name", type: "text" }, { label: "Email", type: "email" }, { label: "Phone", type: "tel" }], button: "Request appointment", aside: ["Complimentary, no obligation to buy", "Alterations made in-house", "Visit us at [[address]]"] },
      ] },
    { slug: "about", nav: "About", title: "About the studio", description: "The story, values and makers behind Maison Vale.",
      sections: [
        { t: "split", title: "A small studio with a long view", body: ["Maison Vale was founded in [[founded]] to make clothes that are worth keeping.", "We work with a handful of workshops, visit them regularly and pay fairly for good work."], img: { art: "rack", alt: "Studio rail", seed: 4 } },
        { t: "timeline", title: "Our story", items: [{ year: "[[founded]]", title: "The first collection", body: "Twelve pieces, made in one workshop." }, { year: "[[date:year]]", title: "The atelier opens", body: "A space to try, fit and alter." }, { year: "Today", title: "Still small on purpose", body: "Two collections a year, our best pieces kept in production." }] },
      ] },
    contactPage({ title: "Get in touch", sub: "Questions about sizing, an order or a repair? We reply within one working day.", description: "Contact Maison Vale.", hours: [["Tue – Sat", "10:00 – 18:00"], ["Sun – Mon", "By appointment"]] }),
    ...legalPages("Maison Vale"),
  ],
  footer: footer({
    blurb: "Considered womenswear in natural fabrics, made in small runs.",
    columns: [
      { title: "Shop", links: [{ label: "Collection", href: "/collection" }, { label: "Lookbook", href: "/lookbook" }, { label: "Atelier", href: "/atelier" }] },
      { title: "Studio", links: [{ label: "About", href: "/about" }, { label: "Journal", href: "/journal" }, { label: "Contact", href: "/contact" }] },
    ],
    social: ["instagram", "pinterest"], newsletter: { title: "Studio news", button: "Subscribe" }, legalName: "Maison Vale",
  }),
};

const CLAY: [string, string, string, "ceramic" | "bottle", number][] = [
  ["Stoneware mug", "Oat glaze", "£24.00", "ceramic", 1], ["Serving bowl", "Sea green", "£48.00", "ceramic", 2], ["Bud vase", "Speckled white", "£28.00", "ceramic", 3], ["Dinner plate", "Set of two", "£52.00", "ceramic", 4],
  ["Hand soap", "Fig and cedar", "£16.00", "bottle", 1], ["Pour-over set", "Charcoal", "£64.00", "ceramic", 5], ["Planter", "Terracotta", "£36.00", "ceramic", 6], ["Room spray", "Linen", "£18.00", "bottle", 2],
];

export const clayAndCo: Site = {
  slug: "clay-and-co", name: "Clay & Co", category: "E-commerce", style: "Soft and earthy", voice: "friendly",
  tagline: "Online shop with collections, product pages, basket, checkout and accounts.",
  description: "A complete online store: home, shop with filters, product pages with options, basket, checkout, customer account, delivery and returns, and an about page — for makers and small brands.",
  palette: { bg: "#faf6f0", surface: "#ffffff", ink: "#2d2a26", muted: "#6f675e", accent: "#b5653b", accent2: "#7a9e7e", soft: "#f1e6d8", line: "#e8ddd0", onAccent: "#ffffff" },
  fonts: { display: "serif", body: "sans" }, logo: { mark: "circle", word: "Clay & Co" }, radius: "soft",
  announcement: "Free delivery on orders over £75",
  primaryCta: { label: "Shop now", href: "/shop" },
  pages: [
    { slug: "", nav: "Home", title: "Handmade ceramics for everyday use", description: "Clay & Co makes small-batch stoneware and home goods by hand. Shop mugs, bowls, vases and gifts.",
      seo: { keywords: ["handmade ceramics", "stoneware mugs", "pottery shop", "home gifts"] },
      sections: [
        { t: "hero", v: "split", eyebrow: "Small-batch stoneware", title: "Pieces made to be used every day", sub: "Mugs, bowls and vases thrown by hand in our studio, glazed in soft earthy colours and fired to last.", ctas: [{ label: "Shop the collection", href: "/shop" }, { label: "Our studio", href: "/about" }], img: { art: "ceramic", alt: "Three handmade ceramic pieces" } },
        { t: "cards", v: "product", title: "Bestsellers", more: { label: "Shop all", href: "/shop" }, cols: 4, items: CLAY.slice(0, 4).map(([t, m, p, a, s]) => ({ title: t, meta: m, price: p, img: { art: a, alt: t, seed: s }, href: "/shop/stoneware-mug" })) },
        { t: "features", title: "Why shop with us", cols: 4, items: [
          { icon: "tool", title: "Handmade", body: "Every piece is thrown and glazed by hand, so each one is slightly different." },
          { icon: "truck", title: "Carefully packed", body: "Recycled, plastic-free packaging that keeps fragile things safe." },
          { icon: "check", title: "Dishwasher safe", body: "Fired at high temperature for strength. Care notes on every page." },
          { icon: "gift", title: "Gift wrapping", body: "Add a handwritten note and wrapping at checkout." },
        ] },
        { t: "split", eyebrow: "From our studio", title: "Made slowly, on purpose", body: ["We make in small batches so we can take care over every piece — and so we never end up with warehouses of stock."], img: { art: "hands", alt: "Hands shaping clay on a wheel" }, cta: { label: "Meet the makers", href: "/about" }, reverse: true },
        { t: "testimonials", sample: true, title: "Customer reviews", items: [{ quote: "The mug is the perfect weight and the glaze is even nicer in person.", name: "Customer review", role: "Replace with a verified review" }, { quote: "Beautifully packed and arrived quickly.", name: "Customer review", role: "Replace with a verified review" }] },
        { t: "newsletter", title: "First look at new batches", sub: "Small batches sell out — subscribers hear first.", button: "Subscribe" },
      ] },
    { slug: "shop", nav: "Shop", title: "Shop", description: "Shop all Clay & Co ceramics and home goods.",
      sections: [{ t: "cards", v: "product", title: "Shop all", sub: "Every piece is handmade, so sizes and glazes vary a little.", filters: ["All", "Mugs", "Bowls", "Vases", "Home"], cols: 4, items: CLAY.map(([t, m, p, a, s]) => ({ title: t, meta: m, price: p, img: { art: a, alt: t, seed: s }, href: "/shop/stoneware-mug" } as Card)) }] },
    { slug: "shop/stoneware-mug", nav: "Stoneware mug", inNav: false, title: "Stoneware mug", description: "A handmade stoneware mug with a soft oat glaze.",
      sections: [
        { t: "detail", v: "product", title: "Stoneware mug", sub: "A generous everyday mug, thrown by hand, with a comfortable handle and a soft oat glaze.", img: { art: "ceramic", alt: "Stoneware mug in oat glaze", seed: 1 }, gallery: [{ art: "ceramic", alt: "Mug from above", seed: 7 }, { art: "ceramic", alt: "Handle detail", seed: 8 }, { art: "hands", alt: "Being glazed", seed: 2 }, { art: "ceramic", alt: "Set of mugs", seed: 9 }], price: "£24.00", options: { name: "Glaze", values: ["Oat", "Sea green", "Speckled white", "Charcoal"] }, facts: [["Capacity", "About 350 ml"], ["Material", "High-fired stoneware"], ["Care", "Dishwasher and microwave safe"], ["Dispatch", "Within 3 working days"]], body: ["Each mug is slightly different in shape and glaze — that's the nature of handmade work."], highlights: ["Free delivery over £75", "30-day returns"], cta: { label: "Add to basket", href: "/cart" } },
        { t: "cards", v: "product", title: "Goes well with", cols: 4, items: CLAY.slice(4, 8).map(([t, m, p, a, s]) => ({ title: t, meta: m, price: p, img: { art: a, alt: t, seed: s }, href: "/shop/stoneware-mug" })) },
      ] },
    { slug: "cart", nav: "Basket", inNav: false, title: "Basket", description: "Review the pieces in your basket before checkout.", sections: [{ t: "cart" }] },
    { slug: "checkout", nav: "Checkout", inNav: false, title: "Checkout", description: "Delivery details and secure payment for your Clay & Co order.", sections: [{ t: "checkout" }] },
    { slug: "account", nav: "Account", inNav: false, title: "Your account", description: "Sign in to see orders and saved addresses.", sections: [{ t: "account" }] },
    { slug: "delivery", nav: "Delivery & returns", title: "Delivery and returns", description: "Delivery options, costs and our returns policy.",
      sections: [
        { t: "rates", title: "Delivery", cols: ["Service", "Time", "Cost"], rows: [["Standard", "3–5 working days", "£4.95, free over £75"], ["Express", "1–2 working days", "£8.95"], ["Collect from studio", "By arrangement", "Free"]], note: "We currently deliver within [[region:delivery countries]]." },
        { t: "faq", title: "Returns", items: [["Can I return something?", "Yes — unused items can be returned within 30 days for a full refund."], ["What if it arrives broken?", "Send us a photo within 7 days and we'll replace it or refund you, no need to send it back."], ["How do I start a return?", "Email [[email]] with your order number."]] },
      ] },
    { slug: "about", nav: "About", title: "About Clay & Co", description: "The studio and people behind Clay & Co.",
      sections: [
        { t: "split", title: "A small studio, a few pairs of hands", body: ["Clay & Co started at a kitchen table in [[founded]] and now lives in a small studio where we throw, glaze and fire everything we sell."], img: { art: "hands", alt: "Potter at the wheel", seed: 4 } },
        { t: "steps", title: "How a piece is made", items: [{ title: "Throw", body: "Shaped on the wheel and left to firm up." }, { title: "Trim and dry", body: "Feet trimmed, handles added, then dried slowly." }, { title: "Glaze", body: "Dipped by hand in glazes we mix ourselves." }, { title: "Fire", body: "High-fired so it's strong enough for daily use." }] },
      ] },
    contactPage({ title: "Questions? We're happy to help", sub: "About an order, a custom set or a wholesale enquiry — we reply within one working day.", description: "Contact Clay & Co.", fields: ["Your name", "Email", "Order number (optional)", "Your message"] }),
    ...legalPages("Clay & Co"),
  ],
  footer: footer({
    blurb: "Small-batch, handmade ceramics for everyday use.",
    columns: [
      { title: "Shop", links: [{ label: "Shop all", href: "/shop" }, { label: "Basket", href: "/cart" }, { label: "Your account", href: "/account" }] },
      { title: "Help", links: [{ label: "Delivery and returns", href: "/delivery" }, { label: "Contact", href: "/contact" }, { label: "About", href: "/about" }] },
    ],
    social: ["instagram", "pinterest", "tiktok"], newsletter: { title: "New batches", button: "Subscribe" }, legalName: "Clay & Co",
  }),
};

export const keystone: Site = {
  slug: "keystone-homes", name: "Keystone Homes", category: "Real Estate", style: "Fresh and confident", voice: "professional",
  tagline: "Estate agency with property search, listings, valuations and guides.",
  description: "A real estate site with property search, listings with key facts, a property detail page with viewing requests, free valuation, buying and selling guides, and team — for agents and developers.",
  palette: { bg: "#f7f9fb", surface: "#ffffff", ink: "#16232e", muted: "#5b6975", accent: "#e4572e", accent2: "#29335c", soft: "#fde9e2", line: "#e1e7ec", onAccent: "#ffffff" },
  fonts: { display: "grotesk", body: "sans" }, logo: { mark: "arch", word: "Keystone" }, radius: "soft",
  primaryCta: { label: "Book a valuation", href: "/valuation" },
  pages: [
    { slug: "", nav: "Home", title: "Homes to buy and rent, with local agents who know the area", description: "Search homes for sale and to rent with Keystone Homes, or book a free valuation.",
      seo: { keywords: ["estate agent", "homes for sale", "property to rent", "free valuation"] },
      sections: [
        { t: "hero", v: "search", eyebrow: "Buy · Rent · Sell", title: "Find the place that feels like home", sub: "Search homes across [[region:area covered]] and get honest advice from agents who live locally.", ctas: [{ label: "Search", href: "/properties" }], search: { placeholder: "Area, street or postcode", fields: ["Buy or rent", "Bedrooms", "Max price"] }, img: { art: "house", alt: "Family home with a garden" } },
        { t: "cards", v: "property", title: "New to the market", more: { label: "All properties", href: "/properties" }, items: [
          { title: "Three-bedroom family home", meta: "[[address:street and town]]", price: "[[price:asking price]]", facts: ["3 beds", "2 baths", "Garden"], img: { art: "house", alt: "Three-bedroom house", seed: 2 }, href: "/properties/family-home", badge: "For sale" },
          { title: "Bright two-bedroom flat", meta: "[[address:street and town]]", price: "[[price:monthly rent]] pcm", facts: ["2 beds", "1 bath", "Balcony"], img: { art: "apartment", alt: "Apartment building", seed: 2 }, href: "/properties/family-home", badge: "To rent" },
          { title: "Victorian terrace", meta: "[[address:street and town]]", price: "[[price:asking price]]", facts: ["4 beds", "2 baths", "Period features"], img: { art: "living-room", alt: "Bright living room", seed: 3 }, href: "/properties/family-home", badge: "For sale" },
        ] },
        { t: "split", eyebrow: "Selling?", title: "Know what your home is worth", body: ["Book a free, no-obligation valuation. We'll explain the price we'd market at and the evidence behind it."], bullets: ["Local comparable sales", "Clear fees, no tie-ins", "Professional photos and floorplans"], img: { art: "blueprint", alt: "Floorplan" }, cta: { label: "Book a valuation", href: "/valuation" } },
        { t: "steps", title: "Buying with us", items: [{ title: "Search and save", body: "Set up alerts for the homes you want." }, { title: "View", body: "Book viewings online, including evenings and weekends." }, { title: "Offer", body: "We'll guide you through making an offer and what happens next." }, { title: "Move", body: "We keep everyone talking until you have the keys." }] },
        { t: "cta", title: "Thinking of moving?", sub: "Talk to a local agent — we'll give you straight answers.", ctas: [{ label: "Contact us", href: "/contact" }] },
      ] },
    { slug: "properties", nav: "Properties", title: "Properties", description: "Homes for sale and to rent with Keystone Homes.",
      sections: [{ t: "cards", v: "property", title: "Properties", filters: ["All", "For sale", "To rent", "New homes"], items: Array.from({ length: 6 }, (_, i) => ({ title: ["Three-bedroom family home", "Bright two-bedroom flat", "Victorian terrace", "Garden flat", "Detached cottage", "City apartment"][i]!, meta: "[[address:street and town]]", price: i % 2 ? "[[price:monthly rent]] pcm" : "[[price:asking price]]", facts: [`${2 + (i % 3)} beds`, `${1 + (i % 2)} baths`], badge: i % 2 ? "To rent" : "For sale", img: { art: (["house", "apartment", "living-room", "house", "house", "skyline"] as const)[i]!, alt: "Property photo illustration", seed: i + 4 }, href: "/properties/family-home" })) }] },
    { slug: "properties/family-home", nav: "Family home", inNav: false, title: "Three-bedroom family home", description: "A three-bedroom family home with a garden.",
      sections: [
        { t: "detail", v: "property", title: "Three-bedroom family home", sub: "A light-filled semi-detached home on a quiet street, with a south-facing garden and room to grow.", img: { art: "house", alt: "Front of the house", seed: 2 }, gallery: [{ art: "living-room", alt: "Living room" }, { art: "living-room", alt: "Kitchen", seed: 5 }, { art: "garden", alt: "Garden" }, { art: "blueprint", alt: "Floorplan" }], price: "[[price:asking price]]", facts: [["Bedrooms", "3"], ["Bathrooms", "2"], ["Tenure", "[[tenure:tenure]]"], ["Council tax", "[[tax:band]]"], ["Energy rating", "[[epc:EPC rating]]"]], body: ["The ground floor opens into a kitchen and dining room across the back of the house, with doors to the garden.", "Upstairs are three bedrooms and a family bathroom, with an en-suite to the main bedroom."], highlights: ["South-facing garden", "Off-street parking", "Close to schools and the station"], cta: { label: "Book a viewing", href: "#book" }, secondary: { label: "Ask a question", href: "/contact" } },
        { t: "booking", kind: "visit", title: "Book a viewing", sub: "Choose a time that suits you and we'll confirm by email.", fields: [{ label: "Date", type: "date" }, { label: "Time", type: "select", options: ["Morning", "Afternoon", "Evening", "Saturday"] }, { label: "Name", type: "text" }, { label: "Email", type: "email" }, { label: "Phone", type: "tel" }, { label: "Position", type: "select", options: ["First-time buyer", "Have a home to sell", "Cash buyer", "Renting"] }], button: "Request viewing", aside: ["Virtual viewings available", "Evening and weekend slots"] },
      ] },
    { slug: "valuation", nav: "Valuation", title: "Free valuation", description: "Book a free, no-obligation valuation of your home.",
      sections: [
        { t: "booking", kind: "visit", title: "Book a free valuation", sub: "An agent will visit, look around and talk you through a realistic price and plan.", fields: [{ label: "Property address", type: "text" }, { label: "Sell or let?", type: "select", options: ["Sell", "Let", "Not sure yet"] }, { label: "Preferred date", type: "date" }, { label: "Name", type: "text" }, { label: "Email", type: "email" }, { label: "Phone", type: "tel" }], button: "Book valuation", aside: ["Takes about 45 minutes", "No obligation", "Written valuation by email"] },
        { t: "rates", title: "Our fees", cols: ["Service", "Fee"], rows: [["Sales", "[[price:sales fee]] inc. VAT"], ["Lettings — tenant find", "[[price:letting fee]] inc. VAT"], ["Lettings — fully managed", "[[price:management fee]] inc. VAT"]], note: "No sale, no fee. Our full fee schedule is available on request. Member of [[regulator:redress scheme]]." },
      ] },
    { slug: "guides", nav: "Guides", title: "Buying and selling guides", description: "Plain-English guides to buying, selling and renting.",
      sections: [{ t: "cards", v: "article", title: "Guides", items: [{ title: "First-time buyer checklist", meta: "Buying · 7 min", body: "From mortgage in principle to moving day.", img: { art: "notebook", alt: "Checklist" } }, { title: "Preparing your home for sale", meta: "Selling · 5 min", body: "Small jobs that make a big difference.", img: { art: "living-room", alt: "Tidy living room", seed: 8 } }, { title: "Renting: what to ask before you sign", meta: "Renting · 6 min", body: "Deposits, inventories and your rights.", img: { art: "apartment", alt: "Flats", seed: 6 } }] }] },
    { slug: "about", nav: "About", title: "About Keystone Homes", description: "Our team and how we work.", sections: [{ t: "team", title: "Your local team", items: [{ name: "[[name:agent name]]", role: "Branch manager" }, { name: "[[name:agent name]]", role: "Sales negotiator" }, { name: "[[name:agent name]]", role: "Lettings manager" }, { name: "[[name:agent name]]", role: "Property manager" }] }] },
    contactPage({ title: "Talk to a local agent", sub: "Buying, selling, renting or letting — we'll get back to you the same working day.", description: "Contact Keystone Homes.", hours: [["Mon – Fri", "09:00 – 18:00"], ["Saturday", "09:00 – 16:00"]] }),
    ...legalPages("Keystone Homes"),
  ],
  footer: footer({
    blurb: "Local estate and letting agents with straight answers.",
    columns: [
      { title: "Property", links: [{ label: "All properties", href: "/properties" }, { label: "Valuation", href: "/valuation" }, { label: "Guides", href: "/guides" }] },
      { title: "Company", links: [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }] },
    ],
    social: ["instagram", "facebook", "linkedin"], newsletter: { title: "Property alerts", button: "Sign up" }, legalName: "Keystone Homes", reg: "Member of [[regulator:redress scheme]] · Client money protection: [[licence:CMP scheme]]",
  }),
};
