"use client";

export default function SNT(fullName: string){

  if (!fullName) return "";
  const words = fullName.trim().split(/\s+/);
  if (words.length <= 2) return fullName;
  const lastNames = words.slice(-2).join(" ");
  const initials = words.slice(0, -2).map((word: string) => word.charAt(0).toUpperCase() + ".").join(" ");
  return `${initials} ${lastNames}`;
};
