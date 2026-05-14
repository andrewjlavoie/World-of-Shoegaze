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

export type Tone = "paper" | "terminal" | "magenta";
export type Density = "tight" | "normal" | "loose";
export type Motion = "snap" | "fast" | "slow";

export interface Settings {
  tone: Tone;
  density: Density;
  motion: Motion;
}
