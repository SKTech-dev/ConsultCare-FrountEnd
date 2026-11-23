import { NavLink } from "react-router-dom";
import { useEffect } from "react";
import PlatformLayout from "../components/PlatformLayout";

const policies = {
  privacy: {
    title: "Privacy policy",
    intro: "Understand the information used during your ConsultCare journey and how it supports your consultations.",
    sections: [
      ["Information in your account", "Your account contains the contact and profile details you provide. Bookings also contain appointment details, payment statuses, consultation messages and any documents or notes shared during the consultation."],
      ["Consultation information", "Information you add to your profile helps your consulting professional prepare. Medical details and weight are shared with your consulting doctor; legal details are shared with your consulting lawyer. Counselling information is shared with your consulting counsellor. General consultation information can be shared with your consulting professional. Share only information relevant to your consultation."],
      ["Payments and service providers", "ConsultCare uses service providers for functions such as payment processing, sign-in and online calls. PayHere handles its checkout flow, Daily.co handles live video and audio consultations, and Google Sign-In may be used for authentication. Bank details you submit for a wallet cash-out are used to review and process that request. These providers also have their own privacy terms."],
      ["Permissions and device access", "With your permission, the mobile app uses your camera and microphone for live video consultations, and photo or document access when you choose to upload consultation files or a profile photo."],
      ["Access, deletion and account security", "Keep your sign-in details private and sign out on shared devices. You can delete your account in Profile inside the mobile app or request deletion at /account-deletion. Accounts with no consultation or payment history are permanently deleted; otherwise sign-in access is permanently removed while consultation, payment and contact records are retained as required by law. Upcoming paid bookings and remaining wallet balances cannot be recovered after deletion."],
      ["Your information and questions", "You can review and update editable profile details in My profile. If you need help with account information, data deletion or a record, contact ConsultCare at ravindu.kavishan@sktech.lk. Avoid including sensitive medical, legal or bank information in a public message."],
    ],
  },
  refunds: {
    title: "Cancellation & refund policy",
    intro: "Review your booking and payment status before cancelling a consultation or requesting a refund.",
    sections: [
      ["Cancelling a booking", "Open the relevant consultation in your workspace and use the cancellation action when available. Read the confirmation message and provide the requested reason. Cancelling releases the booking or queue place; a cancellation does not by itself confirm that a payment has been refunded."],
      ["Refund requests", "Eligibility depends on the booking, payment and attendance records. Use the refund request action where available and describe what happened. Requests involving professional absence may require administrator review. The outcome appears in the relevant record."],
      ["Refund wallet", "Approved wallet credits appear in My profile under Wallet. Available credit is applied first to eligible consultation and clinic payments, with any remaining fee paid through PayHere. Review wallet activity to see credit and spending records."],
      ["Bank cash-outs", "Where available, you can request your entire available wallet balance by providing bank details and confirming they are correct. The requested amount is reserved while the request is processed. Check Cash-outs for its status, bank reference and any payment proof. Submitting a request does not mean a transfer has already been made."],
      ["Payment problems and returns", "ConsultCare provides consultation services, so physical product returns do not apply. If checkout is interrupted or a payment is pending, check the booking status before paying again. Keep your booking and payment references for any review. Review time depends on the case and payment provider; this page does not promise a fixed completion date."],
    ],
  },
  terms: {
    title: "Terms of use",
    intro: "A clear guide to using your ConsultCare account, bookings and consultation space.",
    sections: [
      ["Your account", "Provide accurate account and contact details, keep them up to date, and use your own account. Protect your sign-in credentials and check that your contact information is correct before booking."],
      ["Booking and attending", "Review the professional, session, fee and any appointment instructions before confirming a booking. Queue estimates can change. Be ready at the scheduled time and use the consultation record to follow payment and attendance updates."],
      ["Using the consultation space", "Use messages, calls and document uploads respectfully and for the consultation. Upload information you are entitled to share. Avoid abusive behaviour, impersonation and sharing another person's account credentials."],
      ["Professional services", "Consultations are delivered by the selected professional. Discuss the scope of the consultation and any follow-up directly with them. ConsultCare's online booking and consultation space is not an emergency response service."],
      ["Payments and cancellations", "Check the fee and payment summary before paying. Cancellation and refund requests follow the available booking actions and the cancellation and refund policy. Keep your booking reference if you need help with a payment."],
    ],
  },
  accountDeletion: {
    title: "Account deletion",
    intro: "Understand how to delete your ConsultCare account, what data is removed, and which records are retained for legal and clinical compliance.",
    sections: [
      ["How to delete your account", "Open the ConsultCare mobile app, go to the Profile tab, and choose Delete account. If you no longer have the app installed, email ravindu.kavishan@sktech.lk from your registered email address or submit a request via our Contact page."],
      ["What is deleted vs. retained", "If your account has no consultations, bookings, or payment activity, your account and personal profile data are permanently deleted. If you have consultation or payment history, your login credentials and active sessions are permanently removed so the account can never be accessed again, while consultation, payment, and contact records are retained as required by Sri Lankan medical, legal, and financial record-keeping laws."],
      ["Upcoming bookings and wallet balance", "Any upcoming paid bookings or remaining wallet balance cannot be recovered or refunded once your account is deleted. Please cancel eligible bookings or withdraw your wallet balance before confirming deletion."],
    ],
  },
};

export default function Policies({ type }) {
  const policy = policies[type];
  useEffect(() => { window.scrollTo(0, 0); document.title = policy.title + " | ConsultCare"; return () => { document.title = "ConsultCare"; }; }, [policy.title]);
  return <PlatformLayout><article className="cc-policy"><p className="cc-eyebrow">CONSULTCARE POLICIES</p><h1>{policy.title}</h1><p className="cc-policy-intro">{policy.intro}</p>
    <nav className="cc-policy-nav" aria-label="Policies"><NavLink to="/privacy-policy">Privacy</NavLink><NavLink to="/refund-policy">Cancellations & refunds</NavLink><NavLink to="/terms">Terms of use</NavLink><NavLink to="/account-deletion">Account deletion</NavLink></nav>
    {policy.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}
  </article></PlatformLayout>;
}
