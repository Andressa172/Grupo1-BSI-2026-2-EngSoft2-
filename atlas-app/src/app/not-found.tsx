/**
 * ------------------------------------------------------------
 * 404 ERROR PAGE
 * ------------------------------------------------------------
 */
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 bg-primary/10">
      <div className="mx-auto max-w-2xl text-center">
        {/* 404 */}

        <h1 className="text-8xl font-black tracking-tight text-foreground sm:text-9xl">
          404
        </h1>

        {/* Content */}
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Oops! Page Not Found
        </h2>

        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          The page you’re looking for doesn’t exist anymore, or maybe never
          did. Let’s get you to the right place.
        </p>

        {/* Actions */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">

          <Button variant="primary" size="md" href="/" className="flex items-center gap-2">
            Return to homepage
          </Button>
        </div>
      </div>
    </main>
  );
}