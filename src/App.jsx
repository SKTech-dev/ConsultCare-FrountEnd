import { createBrowserRouter, createRoutesFromElements, Navigate, Outlet, Route, RouterProvider } from "react-router-dom";
import { UnsavedChangesProvider } from "./components/ui/UnsavedChanges";
import ValidationFeedback from "./components/ui/ValidationFeedback";
import { lazy, Suspense, useEffect } from "react";
import GlobalLoader from "./components/ui/GlobalLoader";
import { useDispatch } from "react-redux";
import { clearAuthUser, fetchCurrentUser } from "./features/auth/authSlice";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import Login from "./pages/authPages/Login";
import Setup from "./pages/authPages/Setup";
import AccessDenied from "./pages/AccessDenied";
import Home from "./pages/Home";
import Workspace, { Empty } from "./components/workspace/Workspace";
import Notifications from "./components/workspace/Notifications";
import IncomingConsultation from "./components/workspace/IncomingConsultation";

const Overview = lazy(() => import("./pages/workspace/Overview"));
const Directory = lazy(() => import("./pages/workspace/Directory").then((module) => ({ default: module.Directory })));
const ProfessionalDetails = lazy(() => import("./pages/workspace/Directory").then((module) => ({ default: module.ProfessionalDetails })));
const Bookings = lazy(() => import("./pages/workspace/Bookings").then((module) => ({ default: module.Bookings })));
const BookingDetails = lazy(() => import("./pages/workspace/Bookings").then((module) => ({ default: module.BookingDetails })));
const ProfessionalSessionHistory = lazy(() => import("./pages/workspace/Bookings").then((module) => ({ default: module.ProfessionalSessionHistory })));
const Queue = lazy(() => import("./pages/workspace/Professional").then((module) => ({ default: module.Queue })));
const Sessions = lazy(() => import("./pages/workspace/Professional").then((module) => ({ default: module.Sessions })));
const Profile = lazy(() => import("./pages/workspace/Profile"));
const SessionTransfers = lazy(() => import("./pages/workspace/SessionTransfers"));
const ScheduledConsultations = lazy(() => import("./pages/workspace/ScheduledConsultations"));
const Clinics = lazy(() => import("./pages/workspace/Clinics"));
const ClinicDetails = lazy(() => import("./pages/workspace/Clinics").then((module) => ({ default: module.ClinicDetails })));
const Room = lazy(() => import("./pages/workspace/Room"));
const AdminPeople = lazy(() => import("./pages/workspace/Admin").then((module) => ({ default: module.AdminPeople })));
const AdminPersonDetails = lazy(() => import("./pages/workspace/Admin").then((module) => ({ default: module.AdminPersonDetails })));
const AdminPayments = lazy(() => import("./pages/workspace/Admin").then((module) => ({ default: module.AdminPayments })));
const MonthlyEarnings = lazy(() => import("./pages/workspace/Settlements").then((module) => ({ default: module.MonthlyEarnings })));
const MonthlyEarningsDetails = lazy(() => import("./pages/workspace/Settlements").then((module) => ({ default: module.MonthlyEarningsDetails })));
const AdminSchedules = lazy(() => import("./pages/workspace/AdminSchedules"));

export default function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    const expired = () => dispatch(clearAuthUser());
    window.addEventListener("auth:expired", expired);
    dispatch(fetchCurrentUser());
    return () => window.removeEventListener("auth:expired", expired);
  }, [dispatch]);
  return <Suspense fallback={<GlobalLoader fullPage message="Loading page..." />}><RouterProvider router={router} /></Suspense>;
}

const router = createBrowserRouter(createRoutesFromElements(
  <Route element={<UnsavedChangesProvider><IncomingConsultation /><ValidationFeedback /><Outlet /></UnsavedChangesProvider>}>
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
      <Route path="/app/notifications" element={<Notifications />} />
      <Route path="/consult/doctors" element={<Directory key="doctors" profession="doctor" />} />
      <Route path="/consult/lawyers" element={<Directory key="lawyers" profession="lawyer" />} />
      <Route path="/app/professionals/:id" element={<ProfessionalDetails />} />
      <Route path="/app/bookings" element={<Bookings />} />
      <Route path="/app/history" element={<Bookings history />} />
      <Route path="/app/history/session/:sessionId" element={<ProfessionalSessionHistory />} />
      <Route path="/app/booking/:id" element={<BookingDetails />} />
      <Route path="/app/room/:id" element={<Room />} />
      <Route path="/app/queue" element={<Queue />} />
      <Route path="/app/sessions" element={<Sessions />} />
      <Route path="/app/clinics" element={<Clinics />} />
      <Route path="/app/clinics/:id" element={<ClinicDetails />} />
      <Route path="/app/profile" element={<Profile />} />
      <Route path="/app/admin" element={<AdminPeople />} />
      <Route path="/app/transfers" element={<SessionTransfers />} />
      <Route path="/app/appointments" element={<ScheduledConsultations />} />
      <Route path="/app/weekly-schedules" element={<AdminSchedules />} />
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
  </Route>
));
