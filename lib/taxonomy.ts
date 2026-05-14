// Pure taxonomy — referenced at runtime by every view.
import type { Era, EraKey, MoodColor } from "./types";

export const MOOD_COLORS: Record<string, MoodColor> = {
  euphoric_bliss: { hue: 340, label: "euphoric bliss", desc: "Classic dreamy wall-of-sound" },
  ethereal_celestial: { hue: 200, label: "ethereal celestial", desc: "Voices from another plane" },
  noisy_chaotic: { hue: 15, label: "noisy chaotic", desc: "Beauty buried in feedback" },
  dark_gothic: { hue: 280, label: "dark gothic", desc: "Dream pop with teeth" },
  psychedelic_hypnotic: {
    hue: 50,
    label: "psychedelic hypnotic",
    desc: "Drone, repetition, trance",
  },
  wistful_dreamers: {
    hue: 260,
    label: "wistful dreamers",
    desc: "Gaze with the volume turned down",
  },
  yearning_anthemic: {
    hue: 25,
    label: "yearning anthemic",
    desc: "Big choruses, post-hardcore heart",
  },
  hypnotic_heavy: { hue: 220, label: "hypnotic heavy", desc: "Slow tempos, dense low end" },
  depressive_beauty: {
    hue: 250,
    label: "depressive beauty",
    desc: "Pretty melodies wrapped in despair",
  },
  ecstatic_catharsis: { hue: 320, label: "ecstatic catharsis", desc: "Euphoric noise" },
  apocalyptic_doom: { hue: 0, label: "apocalyptic doom", desc: "End-of-world heaviness" },
  muscular_brooding: { hue: 210, label: "muscular brooding", desc: "Controlled aggression" },
  volatile_violent: { hue: 355, label: "volatile violent", desc: "Beauty interrupted" },
  sun_bleached_sludge: { hue: 35, label: "sun-bleached sludge", desc: "Sludgy 90s alt weariness" },
  modern_anguish: { hue: 310, label: "modern anguish", desc: "Current scene angst" },
  dream_pop_warmth: { hue: 20, label: "dream pop warmth", desc: "Warm, melodic, accessible" },
  lo_fi_bedroom: { hue: 40, label: "lo-fi bedroom", desc: "Homemade, distant, intimate" },
  ambient_drift: { hue: 190, label: "ambient drift", desc: "Near-formless atmosphere" },
  nostalgic_jangly: { hue: 55, label: "nostalgic jangly", desc: "Twee, noise-pop adjacent" },
  experimental_strange: { hue: 170, label: "experimental strange", desc: "Hard to pin down" },
  japanese_gaze: {
    hue: 335,
    label: "Japanese gaze",
    desc: "Japan's sweet-meets-aggressive tradition",
  },
};

export const ERAS: Era[] = [
  { key: "proto", label: "Proto", range: "pre-1989" },
  { key: "first_wave", label: "First Wave", range: "1989–94" },
  { key: "transitional", label: "Transitional", range: "1995–2003" },
  { key: "second_wave", label: "Nu-Gaze", range: "2004–13" },
  { key: "current", label: "Current", range: "2014–now" },
];

export const ERA_ORDER: EraKey[] = [
  "proto",
  "first_wave",
  "transitional",
  "second_wave",
  "current",
];
