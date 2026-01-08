import { Routes, Route } from "react-router-dom";
import { Toaster as SonnerToaster } from "./components/ui/sonner";
import { SiteNav } from "./components/site-nav";
import CookieConsent from "./components/cookie-consent";
import { OnboardingDialog } from "./components/onboarding/onboarding-dialog";
import { NotesWidget } from "./components/notes-widget";
import { SupportWidget } from "./components/support-widget";

import { HomePage } from "./routes/index";
import { BaseValuesPage } from "./routes/base-values";
import { RecipesPage } from "./routes/recipes";
import { FaqPage } from "./routes/faq";
import { UpdatesPage } from "./routes/updates";
import { PrivacyPolicyPage } from "./routes/privacy-policy";
import { NotFoundPage } from "./routes/not-found";

export function App() {
  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-[#101720]" />

      <SiteNav />

      <div className="relative z-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/base-values" element={<BaseValuesPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/updates" element={<UpdatesPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      <div className="relative z-50">
        <OnboardingDialog />
        <SupportWidget />
        <NotesWidget />
        <CookieConsent />
        <SonnerToaster />
      </div>
    </main>
  );
}
