import Landing from "../components/Landing";
import Footer from "../components/Footer";
import { useSelector } from "react-redux";

export default function Home() {
  const colors = useSelector((state) => state.theme.colors);

  return (
    <div className="cc-home min-h-screen" style={Object.fromEntries(Object.entries(colors).map(([key, value]) => [`--cc-${key}`, value]))}>
      <Landing />
      <Footer />
    </div>
  );
}
