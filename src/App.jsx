import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { clearAuthUser, fetchCurrentUser } from "./features/auth/authSlice";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import Login from "./pages/authPages/Login";
import Setup from "./pages/authPages/Setup";
import AccessDenied from "./pages/AccessDenied";
import Home from "./pages/Home";
import Workspace, { Empty } from "./components/workspace/Workspace";
import Overview from "./pages/workspace/Overview";
import { Directory, ProfessionalDetails } from "./pages/workspace/Directory";
import { Bookings, BookingDetails } from "./pages/workspace/Bookings";
import { Queue, Sessions } from "./pages/workspace/Professional";
import Profile from "./pages/workspace/Profile";
import Room from "./pages/workspace/Room";
import { AdminPeople, AdminPersonDetails, AdminPayments } from "./pages/workspace/Admin";
import { MonthlyEarnings, MonthlyEarningsDetails } from "./pages/workspace/Settlements";

export default function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    const expired = () => dispatch(clearAuthUser());
    window.addEventListener("auth:expired", expired);
    dispatch(fetchCurrentUser());
    return () => window.removeEventListener("auth:expired", expired);
  }, [dispatch]);
  return <BrowserRouter><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/access-denied" element={<AccessDenied />} />
    <Route element={<PublicRoute />}>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Setup />} />
      <Route path="/setup" element={<Setup />} />
    </Route>
    <Route element={<ProtectedRoute />}>
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
      <Route path="/app/admin/person/:type/:id" element={<AdminPersonDetails />} />
      <Route path="/app/payments" element={<AdminPayments />} />
      <Route path="/app/settlements" element={<MonthlyEarnings />} />
      <Route path="/app/settlements/:month/:professionalId" element={<MonthlyEarningsDetails />} />
      <Route path="/app/earnings" element={<MonthlyEarnings />} />
      <Route path="/app/earnings/:month" element={<MonthlyEarningsDetails />} />
      <Route path="*" element={<Empty title="Page not found">Use the workspace navigation to continue.</Empty>} />
    </Route>
    {["/dashboard", "/doctor/dashboard", "/lawyer/dashboard", "/admin/dashboard"].map((path) => <Route key={path} path={path} element={<Navigate to="/app" replace />} />)}
    </Route>
  </Routes></BrowserRouter>;
}
