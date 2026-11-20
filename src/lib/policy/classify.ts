import type { PolicyCategory, PolicyLevel } from "./policy";

/**
 * A narrow, deterministic backstop to the AI's own policy judgment.
 *
 * It only fires on harmful FUNCTIONALITY — an action aimed at a target
 * ("steal saved passwords", "a fake bank login page"), never on a topic or a
 * word alone. Defensive, educational, reporting and fictional context lowers
 * the level (except for the categories that have no exceptions). Anything it
 * doesn't catch is still governed by the policy in the AI's instructions.
 */
export type PolicyFinding = { rule: string; category: PolicyCategory; level: PolicyLevel; feature: string; why: string; alternative: string };
export type PolicyResult = { level: PolicyLevel; findings: PolicyFinding[] };

type Rule = {
  id: string;
  category: PolicyCategory;
  level: 3 | 4;
  feature: string;
  why: string;
  alternative: string;
  /** Harmful functionality: an action aimed at a target. Never a bare topic word. */
  match: RegExp[];
  /** Context that makes the request legitimate → allowed. */
  allow?: RegExp;
  /** Context that makes the purpose unclear rather than harmful (fiction, research) → ask (level 2). */
  soften?: RegExp;
};

const PROTECTIVE = /\b(detect\w*|prevent\w*|protect\w*|defen[cs]\w*|awareness|educat\w*|training|course|teach\w*|lessons?|explain\w*|guide|blog|news|article|research\w*|report(ing|s)?\b|safeguard\w*|complian\w*|incident response|recovery|harm reduction|journalis\w*|documentar\w*|histor\w*|museum|warn\w*|scam alerts?|fraud alerts?|anti-\w+|verif\w*|spot\w*|flag\w*)\b/i;
const FICTION = /\b(novel|story|stories|fiction(al)?|screenplay|film|movie|video game|board game|game where|roleplay|tabletop|comic|parody|satire|satirical)\b/i;
const BRANDS = String.raw`(bank|banks|paypal|stripe|google|gmail|microsoft|outlook|office ?365|apple|icloud|facebook|meta|instagram|whatsapp|amazon|netflix|coinbase|binance|metamask|government|irs|hmrc|tax office|police|court|chase|barclays|hsbc|wells fargo)`;

const RULES: Rule[] = [
  {
    id: "csam", category: "A", level: 4,
    feature: "sexual content involving minors",
    why: "Keelwork never generates or hosts sexual content involving anyone under 18.",
    alternative: "Child-safety, safeguarding and reporting tools are welcome.",
    match: [
      /\b(child|children|minors?|under[- ]?age|preteens?|kids?|teens?|teenagers?|schoolgirls?|schoolboys?|loli)\b.{0,40}\b(nudes|nude (photos?|pics?|images?|videos?)|naked (photos?|pics?|images?|videos?)|explicit (photos?|images?|videos?|content)|porn\w*|erotic\w*|nsfw|sexual (images?|photos?|videos?|content|roleplay|chats?))\b/i,
      /\b(nudes|nude (photos?|pics?|images?)|naked (photos?|pics?|images?)|porn\w*|erotic\w*|nsfw|sexual (images?|photos?|videos?|content|roleplay|chats?))\b.{0,40}\b(child|children|minors|under[- ]?age|preteens?|kids|schoolgirls?|schoolboys?)\b/i,
    ],
    // Only clearly protective purposes; there is no fiction or research softening for this category.
    allow: /\b(report\w*|safeguard\w*|child (safety|protection)|prevent\w* (abuse|exploitation)|abuse prevention|detect\w* (abuse|csam|exploitation)|protect\w* children|takedown)\b/i,
  },
  {
    id: "ncii", category: "H", level: 4,
    feature: "non-consensual intimate imagery",
    why: "Undressing real people or making sexual deepfakes of them isn't something Keelwork builds.",
    alternative: "Deepfake detection, takedown-request and consent-education tools are welcome.",
    match: [/\b(undress\w*|nudif\w*)\b/i, /\bremove (the |their |her |his )?clothes from (the |a |any |uploaded )?(photos?|pictures?|images?|selfies?)\b/i, /\b(deepfake|face[- ]?swap)\w*\b.{0,30}\b(porn\w*|nudes?|sexual|explicit|nsfw)\b/i],
    allow: /\b(detect\w*|takedown|report\w*|victim support|remov\w* (it|them|images?) from (the )?(web|internet|platforms?))\b/i,
  },
  {
    id: "credential-theft", category: "D", level: 4,
    feature: "stealing passwords, session cookies, tokens or private data",
    why: "Capturing other people's credentials or private data without authorization is credential theft.",
    alternative: "Secure sign-in, password managers, breach-alert and security-awareness tools are welcome.",
    match: [
      /\b(steal\w*|siphon\w*|exfiltrat\w*)\b.{0,40}\b(passwords?|credentials?|log-?ins?|cookies|tokens?|2fa|otp|one[- ]time (codes?|passwords?)|seed phrases?|private keys?|wallets?|card (numbers|details)|bank (details|logins?)|personal data|private data|messages)\b/i,
      /\b(harvest\w*|grab\w*|hijack\w*)\b.{0,30}\b(passwords?|credentials|session (cookies|tokens)|auth(entication)? (cookies|tokens)|seed phrases?|private keys?)\b/i,
      /\b(secretly|covertly|silently|without (them|the user|users|their|the victim) (knowing|consent|noticing))\b.{0,40}\b(log|record|capture|collect|send|upload)\w*\b.{0,30}\b(keystrokes|passwords?|credentials?|messages|cookies)\b/i,
      /\b(build|make|create|write|develop|install|deploy|hide)\w*\b.{0,30}\bkey ?loggers?\b/i,
    ],
    allow: PROTECTIVE, soften: FICTION,
  },
  {
    id: "phishing", category: "C", level: 4,
    feature: "phishing pages or look-alike login portals",
    why: "Pages built to trick people into handing over logins or payment details by posing as another organization are phishing.",
    alternative: "Your own sign-in pages, phishing-awareness training that uses your own brand, and scam-reporting tools are welcome.",
    match: [
      /\bphishing (page|site|website|kit|campaign|portal|panel|link)s?\b/i,
      new RegExp(String.raw`\b(fake|spoof\w*|look-?alike|impersonat\w*|mimic\w*|counterfeit)\b.{0,40}\b(login|log-in|sign-?in|password|account|verification|payment|checkout) (page|portal|site|form|screen)s?\b.{0,40}\b${BRANDS}\b`, "i"),
      /\b(fake|spoofed|look-?alike|counterfeit)\b.{0,20}\b(bank|banking|government|tax|payment|crypto exchange|police) (site|website|portal|login|page|app)s?\b/i,
      new RegExp(String.raw`\b(fake|spoof\w*|look-?alike|counterfeit|impersonat\w*)\b.{0,15}\b${BRANDS}\b.{0,15}\b(login|log-in|sign-?in|password|verification|payment|checkout) (page|portal|site|form|screen)s?\b`, "i"),
    ],
    // Training and simulations for your own organization are legitimate; fiction just needs a clearly fictional brand.
    allow: /\b(awareness|training|simulat\w*|educat\w*|teach\w*|report\w*|detect\w*|block\w*|anti-?phishing|scam alerts?)\b/i, soften: FICTION,
  },
  {
    id: "brand-clone", category: "K", level: 3,
    feature: "a copy of another organization's login page",
    why: "A replica of a real company's sign-in page is indistinguishable from a phishing page.",
    alternative: "Your own login page with your own branding — including 'Sign in with Google' buttons — is welcome.",
    match: [new RegExp(String.raw`\b(clone|copy|replica|replicate|imitat\w*|pixel[- ]perfect)\b.{0,30}\b(the |their )?${BRANDS}('s)? (login|log-in|sign-?in) (page|portal|screen|form)\b`, "i")],
    allow: /\b(our own|my own|for (our|my) (company|team|app))\b/i, soften: /\b(parody|satire|demo|tutorial|course|fiction\w*|mock-?up)\b/i,
  },
  {
    id: "malware", category: "D", level: 4,
    feature: "malware, ransomware or botnets",
    why: "Software designed to infect, encrypt, control or damage other people's systems isn't something Keelwork builds.",
    alternative: "Malware detection, incident-response, backup and security-training tools are welcome.",
    match: [
      /\b(build|create|make|write|develop|code|deploy|spread|distribute|program|sell)\w*\b.{0,40}\b(ransomware|botnets?|crypters?|info-?stealers?|rootkits?|remote access trojans?|computer virus(es)?|self-?spreading (malware|code|program)|backdoors? into|c2 servers?|command[- ]and[- ]control servers?)\b/i,
      /\b(ransomware|botnet|info-?stealer|crypter)\b.{0,30}\b(builder|panel|kit|as a service|affiliate)\b/i,
      /\bencrypt\w*\b.{0,30}\b(victims?'?|their|other people'?s) (files|data|computers?)\b.{0,40}\b(ransom|pay|bitcoin)\b/i,
    ],
    allow: PROTECTIVE, soften: FICTION,
  },
  {
    id: "ddos", category: "D", level: 4,
    feature: "denial-of-service tools",
    why: "Tools for overwhelming other people's servers are attack tools.",
    alternative: "Load testing your own app (Keelwork's QA does this safely) and DDoS-protection dashboards are welcome.",
    match: [/\b(ddos|denial[- ]of[- ]service|booter|ip stresser)\b.{0,30}\b(tool|panel|service|attack|script|bot)s?\b/i, /\b(take down|knock (offline|down)|flood|overload)\b.{0,15}\b(someone'?s|their|competitors?'?s?|a rival'?s?|other people'?s|other) (site|website|server|game server)s?\b/i],
    allow: /\b(protect\w*|mitigat\w*|defen[cs]\w*|monitor\w*|my own|our own|load test\w*|stress test\w* (my|our)|detect\w*)\b/i,
  },
  {
    id: "fake-records", category: "C", level: 3,
    feature: "fake payment confirmations, receipts, statements or ID documents",
    why: "Fake financial records and identity documents that look real are used to defraud people.",
    alternative: "Real invoicing and receipts for your own business, or clearly watermarked samples, are welcome.",
    match: [/\b(fake|forged|counterfeit|fabricated|bogus)\b.{0,25}\b(payment (confirmation|proof|receipt)s?|proof of payment|bank (statement|transfer|alert)s?|transfer (receipt|confirmation)s?|receipts?|pay ?stubs?|id cards?|identity documents?|passports?|driver'?s licen[cs]es?|diplomas?|degree certificates?|doctor'?s notes?)\b/i],
    allow: PROTECTIVE, soften: FICTION,
  },
  {
    id: "investment-fraud", category: "C", level: 4,
    feature: "Ponzi schemes and fake investments, charities or giveaways",
    why: "Schemes designed to take people's money under false pretences are fraud.",
    alternative: "Legitimate investment, fundraising and donation platforms — and scam-awareness sites — are welcome.",
    match: [/\b(run|start|build|create|launch|set up|operate)\w*\b.{0,20}\b(ponzi|pyramid scheme|pump[- ]and[- ]dump|rug ?pull)\b/i, /\b(ponzi|pyramid) (platform|site|app|investment)\b/i, /\bfake (charity|charities|donations? (page|site|drive)|fundrais\w*|crypto exchange|investment (platform|site|app)|giveaways?|lottery|prize draw)\b/i],
    allow: PROTECTIVE, soften: FICTION,
  },
  {
    id: "extortion", category: "E", level: 4,
    feature: "threats, blackmail or extortion",
    why: "Software for threatening or blackmailing people or companies facilitates extortion.",
    alternative: "Complaint, review and public-interest reporting sites are welcome — say what happened, without threats.",
    match: [/\b(to|i want to|i'?d like to|help me|we('ll| will)?|let'?s|so (i|we) can)\s+(blackmail|extort|sextort)\b/i, /\b(blackmail|extort)\w*\b.{0,30}\binto (paying|giving|sending|handing)\b/i, /\bextort(ing)? (money|payments?|bitcoin|crypto)\b/i, /\b(sextortion|extortion) (scheme|bot|operation|scam|site)\b/i, /\b(website|site|app|bot) (to|that will) threaten\b/i],
    allow: /\b(report\w*|victims?|support|awareness|prevent\w*|research\w*|journalis\w*|news|histor\w*|law enforcement|legal advice)\b/i, soften: FICTION,
  },
  {
    id: "doxxing", category: "G", level: 3,
    feature: "publishing private addresses or contact details to target people",
    why: "Exposing where someone lives or how to reach them so others can harass or attack them is doxxing.",
    alternative: "Complaint and accountability sites that describe what happened, without private contact details, are welcome.",
    match: [/\b(doxx?|doxx?ing)\b.{0,10}\b(him|her|them|people|someone|users|journalists|critics|activists|this person)\b/i, /\bdoxx?ing (site|tool|platform|service|bot)\b/i, /\b(publish|post|expose|share|leak|list)\w*\b.{0,40}\b(home address(es)?|private address(es)?|where (they|he|she) lives?|personal phone numbers?|private phone numbers?|family members'? (names|addresses))\b.{0,60}\b(so (that )?(people|everyone|they|we|users) can|to (harass|attack|target|scare|punish|find|visit))\b/i],
    allow: /\b(protect\w* (against|from) dox\w*|anti-?doxx?ing|privacy protection|remov\w* (my|personal) (data|information))\b/i,
  },
  {
    id: "covert-surveillance", category: "G", level: 3,
    feature: "covert tracking or monitoring of people",
    why: "Secretly tracking someone's location, messages or activity without their knowledge is unlawful surveillance.",
    alternative: "Consent-based location sharing, fleet and delivery tracking, and disclosed device management are welcome.",
    match: [/\b(secretly|covertly|without (their|his|her|them) (knowing|knowledge|consent)|undetect\w*)\b.{0,40}\b(track\w*|monitor\w*|spy\w*|read\w*|record\w*|follow\w*|locat\w*)\b.{0,40}\b(location|phone|messages|whatsapp|texts|calls|wife|husband|partner|girlfriend|boyfriend|ex|spouse|someone|person|employees?)\b/i, /\b(track\w*|monitor\w*|spy\w*|read\w*|record\w*|follow\w*)\b.{0,30}\b(wife|husband|partner|girlfriend|boyfriend|ex|spouse|employees?|neighbou?r|someone)('s|s)?\b.{0,40}\b(secretly|covertly|without (her|his|their|them) (knowing|knowledge|consent))\b/i, /\b(spy on|stalk)\b.{0,20}\b(my|her|his|their|an?|someone)\b.{0,20}\b(wife|husband|partner|girlfriend|boyfriend|ex|spouse|employees?|neighbou?r|person|someone)\b/i, /\bstalkerware\b(?!.{0,20}\b(detect|scan|remov|find))/i],
    allow: /\b(with (their |his |her |explicit )?consent|opt[- ]in|disclosed|transparent|detect\w* (stalkerware|spyware|trackers)|anti-?stalk\w*)\b/i, soften: FICTION,
  },
  {
    id: "fabricated-evidence", category: "N", level: 3,
    feature: "fabricated evidence, fake reviews or fake accusations",
    why: "Inventing evidence, reviews or accusations to deceive people or damage someone's reputation is deceptive manipulation.",
    alternative: "Sites that publish your real experiences, genuine reviews and documented allegations are welcome.",
    match: [/\b(fabricat(e|ed|ing)|fake|forged|made[- ]up|make up|invent(ed|ing)?)\b.{0,30}\b(evidence|screenshots|chat logs|accusations?|allegations?|testimon(y|ies))\b/i, /\b(generate|post|write|buy|sell|create)\w*\b.{0,20}\b(fake|bulk|bot) (reviews|ratings|testimonials|followers|likes|engagement|accounts|votes)\b/i],
    allow: /\b(detect\w*|spot\w*|flag\w*|remov\w*|report\w*|verif\w*|fact[- ]check\w*|moderat\w*)\b/i, soften: FICTION,
  },
  {
    id: "spam-harassment", category: "N", level: 3,
    feature: "mass unsolicited messaging or automated harassment",
    why: "Automating spam or harassment abuses people and other platforms.",
    alternative: "Consent-based newsletters, CRM outreach and customer messaging are welcome.",
    match: [/\b(mass|bulk|blast)\b.{0,20}\b(unsolicited|spam)\b/i, /\bspam (bot|people|users|inboxes|everyone|their (dms|inbox))\b/i, /\b(bot|automat\w*|script)\b.{0,30}\b(harass\w*|troll\w*|brigad\w*|raid\w*)\b/i, /\b(email|phone|sms|whatsapp) (lists?|numbers) (i|we) (bought|scraped)\b/i],
    allow: /\b(opt[- ]in|consent\w*|unsubscribe|subscribers|customers who (signed|opted)|detect\w* (spam|harass\w*|bots?)|anti-?spam|anti-?harassment|moderat\w*|block\w*)\b/i,
  },
  {
    id: "drug-sales", category: "I", level: 4,
    feature: "selling illegal drugs",
    why: "Marketplaces or delivery for illegal drugs facilitate trafficking.",
    alternative: "Pharmacies, prescriptions, recovery, harm-reduction and education apps are welcome.",
    match: [/\b(sell\w*|buy\w*|order\w*|ship\w*|deliver\w*|traffic\w*|marketplace for|shop for|store for)\b.{0,30}\b(cocaine|heroin|meth|methamphetamine|fentanyl|mdma|ecstasy pills|lsd|street drugs|illegal drugs)\b/i, /\b(darknet|dark ?web) (market|shop|store|vendor)s?\b/i],
    allow: /\b(recovery|rehab\w*|harm reduction|treatment|addiction|educat\w*|awareness|prevent\w*|research\w*|test(ing)? kits?|pharmac\w*|prescri\w*|clinic\w*|hospital|journalis\w*|documentar\w*|news|histor\w*)\b/i, soften: FICTION,
  },
  {
    id: "weapons", category: "J", level: 4,
    feature: "illegal weapons or explosives",
    why: "Untraceable guns, explosives and sales that bypass the law facilitate serious harm.",
    alternative: "Licensed retail with legal compliance checks, sporting clubs, museums and safety training are welcome.",
    match: [/\b(ghost guns?|untraceable (guns?|firearms?)|3d[- ]print\w*\b.{0,15}\b(guns?|firearms?|gun receivers?))\b/i, /\b(make|build|assemble|instructions? (for|to)|recipe for|how to make)\b.{0,20}\b((?<!bath |photo |seed |flavou?r |calorie )bombs?|explosives|explosive devices?|ieds?|pipe bombs?|nerve agents?|bioweapons?)\b/i, /\b(sell|buy)\w*\b.{0,20}\b(guns?|firearms?|weapons?)\b.{0,30}\b(without (a )?(licen[cs]e|background checks?|id|paperwork)|no questions asked|anonymously)\b/i],
    allow: /\b(museum|histor\w*|safety|bomb disposal|detect\w*|counter\w*|educat\w*)\b/i, soften: /\b(fiction|novel|video game|game where|film|movie|research\w*)\b/i,
  },
  {
    id: "trafficking", category: "B", level: 4,
    feature: "trafficking or selling people",
    why: "Selling or transporting people for exploitation is human trafficking.",
    alternative: "Victim-support, reporting and awareness tools are welcome.",
    match: [/\b(sell|buy|traffic|smuggl|rent out)\w*\b.{0,20}\b(people|humans|women|girls|boys|children|migrants)\b.{0,30}\b(for (sex|labou?r|marriage|money)|without papers|across the border|as (escorts?|brides|workers))\b/i, /\bhuman trafficking (network|operation|ring|business)\b/i],
    allow: /\b(victims?|support|report\w*|awareness|prevent\w*|rescue|research\w*|journalis\w*|documentar\w*|anti-?trafficking|news)\b/i, soften: FICTION,
  },
  {
    id: "terrorism", category: "F", level: 4,
    feature: "terrorist recruitment, funding or attack planning",
    why: "Software that recruits for, funds or coordinates violent extremist operations isn't something Keelwork builds.",
    alternative: "Research, journalism, counter-extremism education and public-safety tools are welcome.",
    match: [/\b(recruit\w*|fund\w*|fundrais\w*|donat\w*|propaganda|coordinat\w*)\b.{0,30}\b(for|to) (isis|isil|al[- ]qaeda|al[- ]shabaab|boko haram|a terrorist|the jihad|terror(ist)? (cells?|groups?|attacks?))\b/i, /\bplan(ning)? (a |an )?(terror(ist)? attack|mass shooting|bombing campaign|assassination)\b/i],
    allow: /\b(research\w*|journalis\w*|news|histor\w*|counter\w*|deradicali\w*|prevent\w*|report\w*|analys\w*|documentar\w*)\b/i, soften: FICTION,
  },
  {
    id: "laundering", category: "M", level: 4,
    feature: "money laundering or sanctions evasion",
    why: "Systems for hiding where money came from or evading sanctions facilitate financial crime.",
    alternative: "Compliance, AML monitoring, accounting and privacy-respecting payment tools are welcome.",
    match: [/\blaunder(ing)? (the |our |their |my )?(money|funds|cash|crypto|proceeds|bitcoin)\b/i, /\bmoney[- ]laundering (service|scheme|operation|platform|network)\b/i, /\b(evade|evading|bypass\w*|get around)\b.{0,20}\b(sanctions|aml|kyc checks|anti-?money[- ]laundering)\b/i, /\bmix(er|ing)?\b.{0,20}\b(stolen|dirty) (crypto|coins|funds|bitcoin)\b/i],
    allow: /\b(aml|anti-?money|complian\w*|detect\w*|monitor\w*|report\w*|regulat\w*|audit\w*|investigat\w*|educat\w*|training|news|journalis\w*)\b/i, soften: FICTION,
  },
  {
    id: "illegal-gambling", category: "L", level: 3,
    feature: "rigged or unlicensed real-money gambling",
    why: "Rigged odds, or real-money betting that dodges licensing, exploits players.",
    alternative: "Licensed gaming platforms and play-money games are welcome.",
    match: [/\b(rig\w*|fix\w*|manipulat\w*)\b.{0,20}\b(odds|slots?|roulette|casino|outcomes?|draws?|bets?)\b.{0,40}\b(real money|players? (lose|can'?t win)|house always)\b/i, /\b(unlicensed|without a licen[cs]e|offshore to avoid)\b.{0,30}\b(casino|betting|gambling|sportsbook)\b/i],
    allow: /\b(play money|no real money|virtual (coins|chips)|detect\w*|research\w*|educat\w*)\b/i, soften: FICTION,
  },
];

const ORDER: PolicyLevel[] = [0, 1, 2, 3, 4, 5];

/** Classifies a project description or chat message. Most requests return level 0 with no findings. */
export function classifyRequest(text: string): PolicyResult {
  const t = text.replace(/\s+/g, " ").slice(0, 20_000);
  const findings: PolicyFinding[] = [];
  for (const r of RULES) {
    if (!r.match.some((m) => m.test(t))) continue;
    if (r.allow?.test(t)) continue;
    const level: PolicyLevel = r.soften?.test(t) ? 2 : r.level;
    findings.push({ rule: r.id, category: r.category, level, feature: r.feature, why: r.why, alternative: r.alternative });
  }
  const level = findings.reduce<PolicyLevel>((m, f) => (ORDER.indexOf(f.level) > ORDER.indexOf(m) ? f.level : m), 0);
  return { level, findings };
}

/** What the planner is told when the pre-screen finds something (levels 2–3). */
export function plannerNote(r: PolicyResult): string {
  const lines: string[] = [];
  for (const f of r.findings) {
    if (f.level === 3) lines.push(`- Decline this feature and plan the rest: ${f.feature}. List it under "declined" with the reason "${f.why}" and the alternative "${f.alternative}".`);
    if (f.level === 2) lines.push(`- The request may involve ${f.feature}. If the purpose isn't clearly legitimate (${f.alternative.replace(/ are welcome\.?$/, "")}), ask one short question about it under "questions" before planning it.`);
  }
  return lines.length ? `Keelwork policy pre-screen:\n${lines.join("\n")}` : "";
}

/** The person-facing refusal for a prohibited project (level 4): specific, brief, with an alternative. */
export function refusalMessage(r: PolicyResult): string {
  const f = r.findings.filter((x) => x.level >= 4);
  const first = f[0] ?? r.findings[0];
  if (!first) return "";
  return `Keelwork can't build ${f.length > 1 ? `${first.feature} (or ${f.slice(1).map((x) => x.feature).join(", ")})` : first.feature}. ${first.why} ${first.alternative}`;
}
