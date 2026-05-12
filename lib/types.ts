export type EraKey = "proto" | "first_wave" | "transitional" | "second_wave" | "current";

export interface Band {
  name: string;
  subgenre: string;
  country: string;
  era: EraKey;
  album: string;
  year: number;
  intensity: number;
  lat: number;
  lng: number;
  desc: string;
}

export interface MoodColor {
  hue: number;
  label: string;
  desc: string;
}

export interface Era {
  key: EraKey;
  label: string;
  range: string;
}

export interface Scene {
  city: string;
  country: string;
  lat: number;
  lng: number;
  era: EraKey;
  note: string;
}

export interface Discography {
  title: string;
  year: number;
  kind: "LP" | "EP";
  note: string;
}

export interface Palette {
  bg: string;
  accent: string;
  fg: string;
  hue: number;
}

export type Tone = "paper" | "terminal" | "magenta";
export type Density = "tight" | "normal" | "loose";
export type Motion = "snap" | "fast" | "slow";

export interface Settings {
  tone: Tone;
  density: Density;
  motion: Motion;
}
