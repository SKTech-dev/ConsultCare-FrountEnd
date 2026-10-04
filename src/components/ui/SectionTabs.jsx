import { Children, isValidElement, useId, useState } from "react";

function heading(element) {
  if (!isValidElement(element)) return null;
  if (element.props.title) return element.props.title;
  return Children.toArray(element.props.children).map(heading).find(Boolean);
}

// Keep visited panels mounted: changing tabs must not discard drafts or restart video.
export default function SectionTabs({ children, labels = [], label = "Page sections", disabled = false }) {
  const id = useId();
  const [selected, setSelected] = useState(null);
  const items = Children.toArray(children).filter(isValidElement);
  const tabs = items.map((child, index) => ({ child, name: labels[index] || heading(child), key: child.key || String(index) })).filter((item) => item.name);
  const active = tabs.some((item) => item.key === selected) ? selected : tabs[0]?.key;
  const [visited, setVisited] = useState(new Set());
  function choose(key) { setVisited((old) => new Set([...old, active, key])); setSelected(key); }
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
    }}>{tabs.map((item, index) => <button key={item.key} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active === item.key} tabIndex={active === item.key ? 0 : -1} onClick={() => choose(item.key)}>{item.name}</button>)}</div>
    {items.filter((child) => !tabs.some((item) => item.child === child))}
    {tabs.map((item, index) => <div key={item.key} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} hidden={active !== item.key} tabIndex={0}>{(active === item.key || visited.has(item.key)) && item.child}</div>)}
  </div>;
}
