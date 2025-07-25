// routes/_error.tsx - Fresh 2 error page (combines _404.tsx and _500.tsx)
import type { PageProps } from "fresh";

export default function ErrorPage(props: PageProps) {
  const { error } = props;

  // Handle different error types
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;

    if (status === 404) {
      return (
        <div class="error-container">
          <h1>404 - Page Not Found</h1>
          <p>The page you're looking for doesn't exist.</p>
          <a href="/">Go back to home</a>
        </div>
      );
    }

    if (status >= 500) {
      return (
        <div class="error-container">
          <h1>500 - Server Error</h1>
          <p>Something went wrong on our end.</p>
          <a href="/">Go back to home</a>
        </div>
      );
    }
  }

  // Generic error
  return (
    <div class="error-container">
      <h1>Something went wrong</h1>
      <p>An unexpected error occurred.</p>
      <a href="/">Go back to home</a>
    </div>
  );
}
