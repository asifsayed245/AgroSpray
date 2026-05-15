import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/layout/TopBar";

export default function NotFound() {
  return (
    <>
      <TopBar title="Not found" />
      <div className="page flex flex-col items-center justify-center text-center pt-16">
        <div className="text-5xl">🌾</div>
        <h1 className="mt-4 text-xl font-semibold text-ink-900">This field is empty</h1>
        <p className="mt-1 max-w-xs text-sm text-ink-500">
          The page you were looking for doesn't exist yet in this preview.
        </p>
        <Button className="mt-5" asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </>
  );
}
