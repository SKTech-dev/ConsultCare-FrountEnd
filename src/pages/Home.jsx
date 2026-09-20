import Landing from "../components/Landing";
import Footer from "../components/Footer";
import { useSelector } from "react-redux";


export default function Home() {
  const colors = useSelector((state) => state.theme.colors);

  return (
    <main
      className="min-h-screen font-sans flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6"
      style={{ backgroundColor: colors.outerBackground }}
    >
      {/* THE MAIN SHADOW WRAPPER – now for BOTH Landing + Footer */}
      <div
        className="rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl w-full max-w-6xl bg-white overflow-hidden"
        style={{ backgroundColor: colors.background }}
      >
        <Landing colors={colors} />
        <Footer colors={colors} />
      </div>
    </main>
  );
}
