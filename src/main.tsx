import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { CookieConsentProvider } from "./contexts/cookie-consent-context";
import { LanguageProvider } from "./contexts/language-context";
import "./globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CookieConsentProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </CookieConsentProvider>
    </BrowserRouter>
  </React.StrictMode>
);
