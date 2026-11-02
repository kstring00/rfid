export type ItemId = "shoe" | "bag" | "badge" | "fidget" | "plush" | "phones";

export type Item = {
  id: ItemId;
  label: string;
  eyebrow: string;
  title: string;
  lead: string;
  uses: string[];
  chips: { text: string; warn?: boolean }[];
};

export const ITEMS: Item[] = [
  {
    id: "shoe",
    label: "Shoe",
    eyebrow: "Shoe · LacePod",
    title: "The one that stays on",
    lead: "Kids rarely take their shoes off in public, so this is the tag most likely to be with them if they wander.",
    uses: [
      "Laces straight through, so most kids never notice it",
      "Helpers kneel to their level, right where the badge is",
      "A sleeve version slides onto velcro straps",
      "Two-pack: school shoes and play shoes",
    ],
    chips: [{ text: "Usually stays with them" }, { text: "Best for wandering" }],
  },
  {
    id: "bag",
    label: "Backpack",
    eyebrow: "Backpack",
    title: "Everyday introductions",
    lead: "Perfect for the people your child meets every day, without anyone asking twice.",
    uses: [
      "New teachers and substitutes on day one",
      "Bus drivers and aides at pickup",
      "Field trips and camp check-in",
      "Therapists meeting them for the first time",
    ],
    chips: [{ text: "Bags get left behind", warn: true }, { text: "Best for school" }],
  },
  {
    id: "badge",
    label: "Inside the badge",
    eyebrow: "Inside the badge",
    title: "Four layers, no battery",
    lead: "A tiny NFC coil under a printed face. Nothing to charge, nothing to break.",
    uses: [
      "Clear dome protects the QR from scuffs",
      "Printed face shows all three ways in",
      "Copper coil and chip, read by any NFC phone",
      "Soft silicone backing sticks or sews on",
    ],
    chips: [{ text: "Never needs charging" }, { text: "One profile, many tags" }],
  },
  {
    id: "fidget",
    label: "Fidget",
    eyebrow: "Fidget",
    title: "Goes where their hands go",
    lead: "If they never put it down, it's the perfect place for their introduction.",
    uses: [
      "Waiting rooms, restaurants and church",
      "Stuck flat, with nothing to pull off",
      "Move the profile to a new fidget in seconds",
      "Not for kids who chew or mouth toys",
    ],
    chips: [{ text: "Sometimes stays with them", warn: true }, { text: "Best for outings" }],
  },
  {
    id: "plush",
    label: "Plush",
    eyebrow: "Plush",
    title: "Their comfort, their voice",
    lead: "A sewn-on, washable tag for the friend that comes to every hard moment.",
    uses: [
      "Doctor visits and hospital stays",
      "Sleepovers and new babysitters",
      "Caregiver handoff: today's guide on tap",
      "Survives the wash, unlike stickers",
    ],
    chips: [{ text: "Sometimes stays with them", warn: true }, { text: "Best for new caregivers" }],
  },
  {
    id: "phones",
    label: "Headphones",
    eyebrow: "Headphones",
    title: "Already worn all day",
    lead: "Many kids keep their headphones on for the whole outing. The tag rides on the outer band.",
    uses: [
      "Stores, airports and theme parks",
      "Games, concerts and loud events",
      "Easy to spot at eye level",
      "Nothing new touching their skin",
    ],
    chips: [{ text: "Often stays on while out" }, { text: "Best for loud places" }],
  },
];

export const TAG_PLACES = [
  "Shoe",
  "Backpack",
  "Fidget or toy",
  "Plush or comfort item",
  "Headphones",
  "Clothing",
  "Wrist",
  "Not sure yet",
] as const;
