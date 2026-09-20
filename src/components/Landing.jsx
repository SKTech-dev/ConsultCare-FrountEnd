import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, FileText, HeartPulse, Menu, Scale, ShieldCheck, Video, X } from "lucide-react";
import "./landing.css";

const services = [
  { id: "medical", number: "01", label: "For your health", title: "A little clarity.\nA lot of reassurance.", description: "Talk through your health concerns with a doctor, from the comfort of your own space.", icon: HeartPulse, tags: ["Health concerns", "Follow-up care", "Report discussions"], action: "Explore medical consultations" },
  { id: "legal", number: "02", label: "For your peace of mind", title: "Your questions.\nAn informed next step.", description: "Make sense of your legal questions with a professional who can help you understand your options.", icon: Scale, tags: ["Personal matters", "Business questions", "Document discussions"], action: "Explore legal consultations" },
];

const steps = [
  ["01", "Find your person.", "Choose a doctor or lawyer who fits your needs, language, and schedule."],
  ["02", "Make time for you.", "Select a session, review the fee, and confirm your booking."],
  ["03", "Let's talk it through.", "Join your private consultation with your questions and documents ready."],
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState("medical");
  const service = services.find((item) => item.id === selected);
  const ServiceIcon = service.icon;

  return (
    <>
      <a className="cc-skip" href="#main-content">Skip to content</a>
      <header className="cc-header cc-container">
        <a href="/" className="cc-brand" aria-label="ConsultCare home"><span className="cc-brand-icon"><ShieldCheck size={22} /></span>consultcare<span className="cc-brand-dot">.</span></a>
        <nav className="cc-desktop-nav" aria-label="Main navigation">
          <a href="#services">Our services</a><a href="#how-it-works">How it works</a><a href="#privacy">Our approach</a>
        </nav>
        <a className="cc-header-cta" href="#services">Find your consultation <ArrowUpRight size={16} /></a>
        <button className="cc-menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="home-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </header>
      {menuOpen && <nav id="home-navigation" className="cc-mobile-nav cc-container" aria-label="Mobile navigation">{[["#services", "Our services"], ["#how-it-works", "How it works"], ["#privacy", "Our approach"]].map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<ArrowUpRight size={16} /></a>)}</nav>}
      <main id="main-content">
        <section className="cc-hero cc-container">
          <div className="cc-hero-copy">
            <p className="cc-eyebrow"><span /> A good conversation changes things</p>
            <h1>Life has questions.<br />Find your<br /><em>way forward.</em></h1>
            <p className="cc-intro">For your health. For your peace of mind. Connect with doctors and lawyers for thoughtful guidance, wherever you are.</p>
            <div className="cc-hero-actions"><a href="#services" className="cc-button">Find the right support <ArrowUpRight size={19} /></a><a href="#how-it-works" className="cc-text-link">How it works <ArrowDown size={16} /></a></div>
            <div className="cc-hero-note"><span className="cc-note-line" /><span>Real conversations.<br /><strong>With people who understand.</strong></span></div>
          </div>
          <div className="cc-hero-art">
            <div className="cc-art-heading"><span>THE SPACE TO TALK</span><span>01 / 02</span></div>
            <div className="cc-orbit cc-orbit-one" /><div className="cc-orbit cc-orbit-two" />
            <div className="cc-symbol cc-symbol-medical"><HeartPulse strokeWidth={1.15} /></div>
            <div className="cc-symbol cc-symbol-legal"><Scale strokeWidth={1.15} /></div>
            <div className="cc-art-caption"><span>Expertise meets empathy.</span><p>Two kinds of support.<br />One place to begin.</p></div>
            <div className="cc-art-foot"><Video size={17} /><span>Personal. Online. On your terms.</span><ArrowUpRight size={18} /></div>
          </div>
        </section>
        <div className="cc-principles cc-container"><span><HeartPulse size={19} /> Medical & legal expertise</span><span><Video size={19} /> One-to-one conversations</span><span><CalendarDays size={19} /> A time that works for you</span><span><FileText size={19} /> Documents in one place</span></div>

        <section id="services" className="cc-services cc-container">
          <div className="cc-section-heading"><div><p className="cc-eyebrow">THE RIGHT SUPPORT</p><h2>What brings you here?</h2></div><p>Different questions. The same care.<br />Start with what matters to you.</p></div>
          <div className="cc-service-grid">{services.map(({ id, number, label, title, description, icon: Icon, tags, action }) => (
            <article className={"cc-service cc-service-" + id} key={id}>
              <div className="cc-service-top"><span><Icon size={23} />{label}</span><span>{number}</span></div>
              <h3>{title.split("\n").map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</h3>
              <p>{description}</p>
              <ul className="cc-tags">{tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
              <a className="cc-service-link" href="#consultation-guide" onClick={() => setSelected(id)}>{action}<ArrowUpRight size={21} /></a>
            </article>
          ))}</div>
        </section>

        <section id="how-it-works" className="cc-process">
          <div className="cc-container"><div className="cc-section-heading"><div><p className="cc-eyebrow">LESS COMPLICATED. MORE HUMAN.</p><h2>A clear path to your consultation.</h2></div><span className="cc-process-mark"><ArrowDown size={28} strokeWidth={1} /></span></div>
            <ol className="cc-steps">{steps.map(([number, title, description]) => <li key={number}><span className="cc-step-number">{number}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
          </div>
        </section>

        <section id="consultation-guide" className="cc-guide cc-container" aria-labelledby="guide-title">
          <div><p className="cc-eyebrow">A LITTLE PREPARATION GOES A LONG WAY</p><h2 id="guide-title">Make space for<br /><em>the conversation.</em></h2><p>Knowing what you want to discuss helps you get more from your time together.</p></div>
          <div className="cc-guide-panel">
            <div className="cc-service-switch" role="group" aria-label="Consultation guide">{services.map(({ id }) => <button key={id} type="button" aria-pressed={selected === id} onClick={() => setSelected(id)}>{id === "medical" ? "Doctor consultation" : "Lawyer consultation"}</button>)}</div>
            <div className="cc-guide-content" aria-live="polite"><ServiceIcon size={28} strokeWidth={1.5} /><h3>{selected === "medical" ? "Before you speak with a doctor" : "Before you speak with a lawyer"}</h3><ul>{(selected === "medical" ? ["Write down the concerns you want to discuss.", "Have relevant reports and medication details ready.", "Choose a quiet place for your conversation."] : ["Summarise the question you need help with.", "Gather relevant documents and important dates.", "Note the outcome you would like to work towards."]).map((item) => <li key={item}><Check size={16} /><span>{item}</span></li>)}</ul><p className="cc-launch-note">Online booking is coming soon. Explore the consultation journey above.</p></div>
          </div>
        </section>

        <section id="privacy" className="cc-privacy cc-container"><div className="cc-privacy-inner"><ShieldCheck size={36} strokeWidth={1.2} /><div><p className="cc-eyebrow">BUILT AROUND TRUST</p><h2>Personal matters deserve<br />a thoughtful space.</h2><p>We are building ConsultCare around private conversations, clear professional profiles, and access to your own consultation records.</p></div><a href="#services" className="cc-privacy-link">Find your starting point <ArrowRight size={19} /></a></div></section>
      </main>
    </>
  );
}
