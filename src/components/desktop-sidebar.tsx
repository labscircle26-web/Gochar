import { Link } from "@tanstack/react-router";

type DesktopSidebarProps = {
  active: "sky" | "charts";
};

const itemClass = "gochar-side-link";
const activeClass = "gochar-side-link gochar-side-link--active";

export function DesktopSidebar({ active }: DesktopSidebarProps) {
  return (
    <aside className="gochar-desktop-sidebar" aria-label="Gochar desktop navigation">
      <Link to="/" className="gochar-side-brand" aria-label="Gochar home">
        <img src="/gochar-icon-192.png" alt="" />
        <span>
          <strong>Gochar</strong>
          <small>SIDEREAL WORKSPACE</small>
        </span>
      </Link>

      <p className="gochar-side-heading">Workspace</p>
      <nav className="gochar-side-nav">
        <Link to="/" className={active === "sky" ? activeClass : itemClass}>
          <span className="gochar-side-icon">◉</span>
          Live sky
        </Link>
        <a href="/#transit-chart" className={active === "sky" ? itemClass : itemClass}>
          <span className="gochar-side-icon">⌖</span>
          Transit chart
        </a>
        <a href="/#transit-timeline" className={itemClass}>
          <span className="gochar-side-icon">◷</span>
          Time explorer
        </a>
        <a href="/#upcoming-transits" className={itemClass}>
          <span className="gochar-side-icon">↗</span>
          Upcoming transits
        </a>
        <a href="/#personal-transit-alerts" className={itemClass}>
          <span className="gochar-side-icon">◎</span>
          Personal alerts
        </a>
        <Link to="/charts" className={active === "charts" ? activeClass : itemClass}>
          <span className="gochar-side-icon">▦</span>
          Birth charts
        </Link>
      </nav>

      <div className="gochar-side-bottom">
        <span className="gochar-side-status-dot" />
        <span>Sidereal engine</span>
        <Link to="/developer">Developer</Link>
      </div>
    </aside>
  );
}
