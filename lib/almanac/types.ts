export const ADMIN_EMAIL = "keeper@gochar.app";

export type AlmanacBoard = {
  notice: string;
  footer: string;
  placeLabel: string;
  lat: number;
  lon: number;
  tz: string;
};

export const DEFAULT_BOARD: AlmanacBoard = {
  notice: "",
  footer: "",
  placeLabel: "Delhi, India",
  lat: 28.6139,
  lon: 77.209,
  tz: "Asia/Kolkata",
};
