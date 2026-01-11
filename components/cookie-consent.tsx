"use client";

import { useState, useEffect, useMemo } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Switch } from "./ui/switch";
import { useCookieConsent } from "@/contexts/cookie-consent-context";
import { useLanguage } from "@/contexts/language-context";

interface CookieType {
  id: string;
  name: string;
  description: string;
  required?: boolean;
  defaultValue?: boolean;
}

export default function CookieConsent() {
  const { setHasConsent } = useCookieConsent();
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState<boolean | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});

  const cookieTypes: CookieType[] = useMemo(
    () => [
      {
        id: "necessary",
        name: t("Necessary"),
        description: t(
          "These cookies are necessary for the website to function properly and cannot be switched off."
        ),
        required: true,
        defaultValue: true,
      },
      {
        id: "analytics",
        name: t("Analytics"),
        description: t(
          "These cookies help us improve the site by tracking which pages are most popular and how visitors move around the site."
        ),
        defaultValue: true,
      },
      {
        id: "advertising",
        name: t("Advertising"),
        description: t(
          "These cookies are used to make advertising messages more relevant to you and your interests."
        ),
        defaultValue: false,
      },
    ],
    [t]
  );

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const consent = localStorage.getItem("cookieConsent");
      if (!consent) {
        setIsVisible(true);
        // Initialize preferences with default values
        const initialPreferences = cookieTypes.reduce(
          (acc, type) => ({
            ...acc,
            [type.id]: type.defaultValue ?? false,
          }),
          {}
        );
        setPreferences(initialPreferences);
      } else {
        setIsVisible(false);
        setHasConsent(true);
        try {
          const savedPreferences = JSON.parse(consent);
          setPreferences(savedPreferences);
        } catch (e) {
          console.error("Error parsing cookie preferences:", e);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cookieTypes, setHasConsent]);

  const handleAcceptAll = () => {
    const allAccepted = cookieTypes.reduce(
      (acc, type) => ({
        ...acc,
        [type.id]: true,
      }),
      {}
    );
    saveConsent(allAccepted);
  };

  const handleDismiss = () => {
    // Dismiss with default preferences (essential cookies only)
    const essentialOnly = cookieTypes.reduce(
      (acc, type) => ({
        ...acc,
        [type.id]: type.defaultValue ?? false,
      }),
      {}
    );
    saveConsent(essentialOnly);
  };

  const handlePreferenceChange = (typeId: string, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [typeId]: value,
    }));
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  const saveConsent = (prefs: Record<string, boolean>) => {
    localStorage.setItem("cookieConsent", JSON.stringify(prefs));
    setIsVisible(false);
    setShowPreferences(false);
    setHasConsent(true);

    // Handle analytics consent
    if (prefs.analytics) {
      window.gtag?.("consent", "update", {
        analytics_storage: "granted",
      });
      window.dataLayer?.push({
        event: "consent_accepted_analytics",
      });
    } else {
      window.gtag?.("consent", "update", {
        analytics_storage: "denied",
      });
    }

    // Handle advertising consent
    if (prefs.advertising) {
      window.gtag?.("consent", "update", {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
      });
      window.dataLayer?.push({
        event: "consent_accepted_advertising",
      });
    } else {
      window.gtag?.("consent", "update", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    }
  };

  if (isVisible !== true) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md z-50">
        <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-lg animate-slide-up">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              <Cookie className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-medium text-white">
                  {t("Cookie Preferences")}
                </h3>
                <button
                  onClick={handleDismiss}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-300 transition-colors"
                  aria-label={t("Close cookie notification")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed mt-1">
                {t("We use cookies to enhance your experience.")}{" "}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPrivacyPolicy(true);
                  }}
                  className="text-blue-400 hover:text-blue-300 underline transition-colors text-xs"
                >
                  {t("Privacy Policy")}
                </button>
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreferences(true)}
              className="text-gray-300 hover:text-white h-8 px-3 text-xs"
            >
              {t("Customize")}
            </Button>
            <Button
              onClick={handleAcceptAll}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors duration-200 h-8 px-3 text-xs"
            >
              {t("Accept All")}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Cookie Preferences")}</DialogTitle>
            <DialogDescription>
              {t(
                "Customize which cookies you want to accept. Some cookies are necessary for the website to function properly."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {cookieTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-start justify-between space-x-4"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium leading-none">
                      {type.name}
                    </h4>
                    {type.required && (
                      <span className="text-xs text-gray-500">
                        ({t("Required")})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1.5">
                    {type.description}
                  </p>
                </div>
                <Switch
                  checked={preferences[type.id] ?? false}
                  onCheckedChange={(checked) =>
                    handlePreferenceChange(type.id, checked)
                  }
                  disabled={type.required}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPreferences(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleSavePreferences}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t("Save Preferences")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Privacy Policy")}</DialogTitle>
            <DialogDescription>
              {t("Last updated: February 3, 2025")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 text-sm">
            <section>
              <h3 className="text-lg font-semibold mb-2">
                {t("Cookie Usage")}
              </h3>
              <p className="mb-4">
                {t(
                  "We use different types of cookies to optimize your experience on our website. Cookies are small text files that are stored on your device when you visit our website."
                )}
              </p>

              <h4 className="font-medium mb-2">{t("Necessary Cookies")}</h4>
              <p className="mb-4">
                {t(
                  "These cookies are essential for the website to function properly. They enable basic functions like page navigation, access to secure areas, and proper website operation. The website cannot function properly without these cookies."
                )}
              </p>

              <h4 className="font-medium mb-2">{t("Analytics Cookies")}</h4>
              <p className="mb-4">
                {t(
                  "Analytics cookies help us understand how visitors interact with our website. These cookies help provide information on metrics like number of visitors, bounce rate, traffic source, etc. This helps us improve our website performance and user experience."
                )}
              </p>

              <h4 className="font-medium mb-2">{t("Advertising Cookies")}</h4>
              <p className="mb-4">
                {t(
                  "These cookies are used to deliver advertisements more relevant to you and your interests. They are also used to limit the number of times you see an advertisement and help measure the effectiveness of advertising campaigns."
                )}
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">{t("Contact Us")}</h3>
              <p>
                {t(
                  "If you have any questions about our cookie policy or privacy practices, please contact us at cultistcirclecalculator@gmail.com."
                )}
              </p>
            </section>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setShowPrivacyPolicy(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t("Close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
