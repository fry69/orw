// routes/changes.tsx - Changes page (converted from ChangeList component)
import type { PageProps } from "fresh";

export default function ChangesPage(_props: PageProps) {
  return (
    <div>
      <nav>
        <ul>
          <li class="github-link">
            <a
              href="https://github.com/fry69/orw"
              target="_blank"
              rel="noopener noreferrer"
              class="button-link"
            >
              <img
                class="image-link"
                src="/github.svg"
                alt="GitHub repository"
                width="32"
                height="32"
              />
            </a>
          </li>
          <li>
            <a href="/list">Models</a>
          </li>
          <li class="changes-container">
            <a href="/changes" class="active">Changes</a>
            <a href="/rss" class="button-link rss-link">
              <img class="image-link" src="/rss.svg" alt="RSS Feed" width="16" height="16" />
            </a>
          </li>
          <li class="info-container">
            <span>Fresh 2 Migration in Progress...</span>
          </li>
        </ul>
      </nav>
      <div class="main-content">
        <h1>OpenRouter Model Changes</h1>
        <p>Fresh 2 migration is in progress. This page will show model changes.</p>
        <p>
          The real change list will be implemented as an Island component with real-time updates.
        </p>
      </div>
    </div>
  );
}
