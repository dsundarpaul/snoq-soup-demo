import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import TreasureHunterSignupPage from "@/sections/treasure-hunter/treasure-hunter-signup";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <TreasureHunterSignupPage />
    </Suspense>
  );
}
