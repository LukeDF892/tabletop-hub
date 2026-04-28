"use client";

const GUEST_NAME_KEY = "tabletop_guest_name";
const GUEST_MODE_KEY = "tabletop_guest_mode";

const ADJECTIVES = [
  "Bold", "Cursed", "Dark", "Elven", "Fierce", "Grim", "Heroic",
  "Iron", "Jade", "Lost", "Mystic", "Noble", "Orcish", "Pale",
  "Quiet", "Runed", "Scarred", "Twisted", "Undying", "Veiled",
];

const NOUNS = [
  "Archer", "Bard", "Cleric", "Drake", "Exile", "Fang",
  "Guardian", "Hunter", "Invoker", "Justiciar", "Knight", "Lancer",
  "Mage", "Nomad", "Oracle", "Paladin", "Ranger", "Sentinel",
  "Tracker", "Unchained", "Vagabond", "Warden", "Zealot",
];

function generateGuestName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}${noun}${num}`;
}

export function getGuestName(): string {
  if (typeof window === "undefined") return "Guest";
  let name = localStorage.getItem(GUEST_NAME_KEY);
  if (!name) {
    name = generateGuestName();
    localStorage.setItem(GUEST_NAME_KEY, name);
  }
  return name;
}

export function enterGuestMode(): void {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(GUEST_NAME_KEY)) {
    localStorage.setItem(GUEST_NAME_KEY, generateGuestName());
  }
  localStorage.setItem(GUEST_MODE_KEY, "true");
}

export function isGuestMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GUEST_MODE_KEY) === "true";
}

export function exitGuestMode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_MODE_KEY);
}
