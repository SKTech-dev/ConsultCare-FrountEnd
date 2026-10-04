import { Children, isValidElement, useEffect, useId, useState } from "react";
import { useSearchParams } from "react-router-dom";

function heading(element) {
  if (!isValidElement(element)) return null;
  if (element.props.title) return element.props.title;
  return Children.toArray(element.props.children).map(heading).find(Boolean);
}

// Keep visited panels mounted: changing tabs must not discard drafts or restart video.
export default function SectionTabs({ children, labels = [], icons = [], ids = [], order = [], defaultTab, label = "Page sections", disabled = false }) {
  const id = useId();
  const [params, setParams] = useSearchParams();
  const items = Children.toArray(children).filter(isValidElement);
  const tabs = items.map((child, index) => {
    const name = labels[index] || heading(child);
    return { child, name, icon: icons[index], key: ids[index] || String(name || index).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") };
  }).filter((item) => item.name).sort((a, b) => {
    const rank = (key) => order.includes(key) ? order.indexOf(key) : order.length;
    return rank(a.key) - rank(b.key);
  });
  const selected = params.get("tab");
  const active = tabs.find((item) => item.key === selected)?.key || tabs.find((item) => item.key === defaultTab)?.key || tabs[0]?.key;
  const [visited, setVisited] = useState(new Set());
  useEffect(() => { if (active) setVisited((old) => old.has(active) ? old : new Set([...old, active])); }, [active]);
  function choose(key) {
    setVisited((old) => new Set([...old, active, key]));
    setParams((previous) => { const next = new URLSearchParams(previous); next.set("tab", key); return next; }, { preventScrollReset: true });
  }
  if (disabled) return <>{children}</>;
  if (tabs.length < 2) return <div className="workspace-sections">{children}</div>;
  return <div className="section-tabs">
    <div className="section-tab-list" role="tablist" aria-label={label} onKeyDown={(event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.findIndex((item) => item.key === active);
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      choose(tabs[next].key);
      document.getElementById(`${id}-tab-${next}`)?.focus();
    }}>{tabs.map((item, index) => <button key={item.key} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active === item.key} tabIndex={active === item.key ? 0 : -1} onClick={() => choose(item.key)}>{item.icon}<span>{item.name}</span></button>)}</div>
    {items.filter((child) => !tabs.some((item) => item.child === child))}
    {tabs.map((item, index) => <div key={item.key} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} hidden={active !== item.key} tabIndex={0}>{(active === item.key || visited.has(item.key)) && item.child}</div>)}
  </div>;
}
