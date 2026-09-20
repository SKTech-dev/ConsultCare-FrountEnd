import { Link } from "react-router-dom";
import PlatformLayout from "../components/PlatformLayout";
export default function AccessDenied() {
  return <PlatformLayout><h1 className="text-4xl font-serif">This account cannot access that page.</h1><p className="my-6">Your server-assigned role does not allow this destination, or your account has no recognised role. Contact your administrator to check your account.</p><Link to="/" className="cc-button">Return home</Link></PlatformLayout>;
}
