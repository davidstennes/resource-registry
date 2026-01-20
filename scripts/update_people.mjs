import fs from "fs";

function toList(s){
  if(!s) return [];
  const t = s.trim();
  if(!t) return [];
  if(t.toLowerCase() === "none") return [];
  return t.split(",").map(x=>x.trim()).filter(Boolean);
}

function extract(body, label){
  // Issue form renders markdown like:
  // ### Alias / handle
  // Mesa
  const re = new RegExp(`###\\s+${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+([\\s\\S]*?)(?=\\n###\\s+|$)`, "i");
  const m = body.match(re);
  if(!m) return "";
  return (m[1] || "").trim();
}

const issueBodyPath = process.argv[2];
if(!issueBodyPath){
  console.error("Missing issue body path");
  process.exit(1);
}

const issueBody = fs.readFileSync(issueBodyPath, "utf8");

// Labels must match exactly what appears in the issue
const alias = extract(issueBody, "Alias / handle");
const skills = toList(extract(issueBody, "Skills (comma-separated)"));
const offers = toList(extract(issueBody, "Offers (comma-separated)"));
const needs  = toList(extract(issueBody, "Needs (comma-separated)"));
const location = extract(issueBody, "General location (optional)");
const note = extract(issueBody, "Note (optional)");
const invitecode = extract(issueBody, "Invite code (optional)");

if(!alias){
  console.error("Alias missing in issue body");
  process.exit(1);
}

const dataPath = "people.json";
const raw = fs.readFileSync(dataPath, "utf8");
let people = JSON.parse(raw);

const norm = (s)=> (s||"").trim().toLowerCase();
const idx = people.findIndex(p => norm(p.alias) === norm(alias));

const entry = {
  alias: alias.trim(),
  skills,
  offers,
  needs,
  location: location || "",
  note: note || ""
};

if(idx >= 0){
  // Update existing entry but preserve fields if user left blank
  const prev = people[idx] || {};
  people[idx] = {
    ...prev,
    ...entry,
    skills: skills.length ? skills : (prev.skills || []),
    offers: offers.length ? offers : (prev.offers || []),
    needs:  (extract(issueBody, "Needs (comma-separated)") ? needs : (prev.needs || [])),
    location: (location ? location : (prev.location || "")),
    note: (note ? note : (prev.note || ""))
  };
} else {
  people.push(entry);
}

people.sort((a,b)=>(a.alias||"").localeCompare(b.alias||""));

fs.writeFileSync(dataPath, JSON.stringify(people, null, 2) + "\n", "utf8");

// Output invite code so workflow can check it if desired
fs.writeFileSync(".invitecode.txt", invitecode || "", "utf8");
console.log("Updated people.json for alias:", alias);
