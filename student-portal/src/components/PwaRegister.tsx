"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("PWA Service Worker registered successfully.", registration.scope);
          })
          .catch((err) => {
            console.error("PWA Service Worker registration failed: ", err);
          });
      });
    }
  }, []);

  // Renders nothing, simply executes the background registration script.
  return null;
}
