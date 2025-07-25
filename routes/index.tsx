// routes/index.tsx - Home page (redirects to /changes)
import type { PageProps } from "fresh";

export const handler = {
  GET: () => {
    // Redirect to /changes as in the original React Router setup
    return new Response("", {
      status: 302,
      headers: { Location: "/changes" },
    });
  },
};

// This component should never render due to the redirect
export default function Home(_props: PageProps) {
  return (
    <div>
      <p>Redirecting...</p>
    </div>
  );
}
