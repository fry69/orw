// routes/index.tsx - Home page (redirects to /changes)

export function handler(_req: Request): Response {
  // Redirect to /changes as in the original React Router setup
  return new Response("", {
    status: 302,
    headers: { Location: "/changes" },
  });
}
