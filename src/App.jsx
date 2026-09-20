import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Workspace, { Empty } from "./components/workspace/Workspace";
import Overview from "./pages/workspace/Overview";
import { Directory, ProfessionalDetails } from "./pages/workspace/Directory";
import { Bookings, BookingDetails } from "./pages/workspace/Bookings";
import { Queue, Sessions } from "./pages/workspace/Professional";
import Profile from "./pages/workspace/Profile";
import Room from "./pages/workspace/Room";
import { AdminPeople, AdminIssues } from "./pages/workspace/Admin";

// Frontend-only prototype: the workspace is always signed in.
// No authentication or API calls run until a real backend is integrated.
export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<Home />} />
    <Route element={<Workspace />}>
      <Route path="/app" element={<Overview />} />
      <Route path="/consult/doctors" element={<Directory key="doctors" profession="doctor" />} />
      <Route path="/consult/lawyers" element={<Directory key="lawyers" profession="lawyer" />} />
      <Route path="/app/professionals/:id" element={<ProfessionalDetails />} />
      <Route path="/app/bookings" element={<Bookings />} />
      <Route path="/app/history" element={<Bookings history />} />
      <Route path="/app/booking/:id" element={<BookingDetails />} />
      <Route path="/app/room/:id" element={<Room />} />
      <Route path="/app/queue" element={<Queue />} />
      <Route path="/app/sessions" element={<Sessions />} />
      <Route path="/app/profile" element={<Profile />} />
      <Route path="/app/admin" element={<AdminPeople />} />
      <Route path="/app/issues" element={<AdminIssues />} />
      <Route path="*" element={<Empty title="Page not found">Use the workspace navigation to continue.</Empty>} />
    </Route>
    {["/login", "/signup", "/setup", "/dashboard", "/doctor/dashboard", "/lawyer/dashboard", "/admin/dashboard"].map((path) => <Route key={path} path={path} element={<Navigate to="/app" replace />} />)}
  </Routes></BrowserRouter>;
}
