// routes/list.tsx - Model list page (converted from ModelList component)
import type { PageProps } from "fresh";

export default function ListPage(_props: PageProps) {
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
            <a href="/list" class="active">Models</a>
          </li>
          <li class="changes-container">
            <a href="/changes">Changes</a>
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
        <h1>OpenRouter Models</h1>
        <p>Fresh 2 migration is in progress. This page will show the model list.</p>
        <p>
          The real model list will be implemented as an Island component with filtering and sorting.
        </p>
      </div>
    </div>
  );
}
