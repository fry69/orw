// orw-deno/components/navbar/NavLinks.tsx
import { ChangeIcon, HamburgerIcon, ModelIcon, RemovedIcon, RssIcon } from "../Icons.tsx";

const navLinks = [
  {
    href: "/list",
    title: "Models",
    Icon: ModelIcon,
  },
  {
    href: "/changes",
    title: "Changes",
    Icon: ChangeIcon,
  },
  {
    href: "/removed",
    title: "Removed",
    Icon: RemovedIcon,
  },
  {
    href: "/rss",
    title: "RSS",
    Icon: RssIcon,
  },
];

export default function NavLinks() {
  const currentPath = globalThis.location?.pathname;

  return (
    <div class="flex gap-1">
      {/* Full links on larger screens (lg) */}
      <div class="hidden lg:flex gap-1">
        {navLinks.map(({ href, title, Icon }) => (
          <a
            href={href}
            class={`btn btn-ghost btn-sm gap-2 ${currentPath === href ? "btn-accent" : ""}`}
            title={title}
          >
            <Icon size={16} />
            {title}
          </a>
        ))}
      </div>

      {/* Icon-only links on medium screens (md) */}
      <div class="hidden md:flex lg:hidden gap-1">
        {navLinks.map(({ href, title, Icon }) => (
          <a
            href={href}
            class={`btn btn-ghost btn-square btn-sm ${currentPath === href ? "btn-accent" : ""}`}
            title={title}
          >
            <Icon size={16} />
          </a>
        ))}
      </div>

      {/* Mobile dropdown menu (sm) */}
      <div class="md:hidden">
        <div class="dropdown">
          <div tabIndex={0} role="button" class="btn btn-ghost btn-sm">
            <HamburgerIcon />
          </div>
          <ul
            tabIndex={0}
            class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
          >
            {navLinks.map(({ href, title, Icon }) => (
              <li>
                <a
                  href={href}
                  class={currentPath === href ? "active" : ""}
                >
                  <Icon size={16} />
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
