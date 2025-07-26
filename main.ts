import { App, staticFiles } from "fresh";
// import { App } from "fresh";
// import { define, type State } from "./lib/app.ts";
import type { State } from "./lib/app.ts";

export const app = new App<State>();

app.use(staticFiles());

// this is the same as the /api/:name route defined via a file. feel free to delete this!
// app.get("/api2/:name", (ctx) => {
//   const name = ctx.params.name;
//   return new Response(
//     `Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`,
//   );
// });

// this can also be defined via a file. feel free to delete this!
// const exampleLoggerMiddleware = define.middleware((ctx) => {
//   console.log(`${ctx.req.method} ${ctx.req.url}`);
//   return ctx.next();
// });
// app.use(exampleLoggerMiddleware); // Temporarily disabled for testing

// Add health check route for monitoring/testing (before fsRoutes)
app.get("/health", () => new Response("OK", { status: 200 }));

// Add root route manually as fallback (should be overridden by fsRoutes)
// app.get("/", () => new Response("", {
//   status: 302,
//   headers: { Location: "/changes" },
// }));

// Include file-system based routes here
app.fsRoutes();
