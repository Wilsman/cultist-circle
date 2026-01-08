import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  function handleBack() {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-my_bg_image bg-no-repeat bg-cover text-gray-100 p-4 overflow-auto">
      <Card className="bg-gray-800 border-gray-700 text-secondary shadow-lg max-h-fit overflow-auto py-8 px-6 relative w-full max-w-2xl mx-auto bg-opacity-50">
        <CardHeader className="relative">
          <button
            className="absolute top-0 left-0 p-2 text-white"
            onClick={handleBack}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <CardTitle className="text-3xl sm:text-4xl lg:text-5xl text-center text-red-500">
            Privacy Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-6">
          <div className="space-y-4">
            <div className="p-3 bg-gray-800/90 rounded-lg shadow-md">
              <h2 className="text-orange-400 text-sm font-medium uppercase tracking-wider mb-2">Local Storage</h2>
              <p className="text-gray-100 text-sm leading-relaxed">
                We store your calculator preferences locally, including excluded item categories, threshold settings, sort options, and custom price overrides. This data stays on your device and helps maintain your preferred calculator configuration between sessions.
              </p>
            </div>

            <div className="p-3 bg-gray-800/90 rounded-lg shadow-md">
              <h2 className="text-orange-400 text-sm font-medium uppercase tracking-wider mb-2">Analytics</h2>
              <p className="text-gray-100 text-sm leading-relaxed">
                We use Google Analytics to understand how players use our calculator. This helps us improve features like item filtering, price thresholds, and category management. We only collect anonymous usage data and basic performance metrics.
              </p>
            </div>

            <div className="p-3 bg-gray-800/90 rounded-lg shadow-md">
              <h2 className="text-orange-400 text-sm font-medium uppercase tracking-wider mb-2">Your Control</h2>
              <ul className="text-gray-100 text-sm leading-relaxed list-disc pl-4 space-y-1">
                <li>Clear browser data to reset calculator preferences and custom settings</li>
                <li>Use browser settings or extensions to opt-out of analytics</li>
              </ul>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Last updated: February 2, 2025
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
