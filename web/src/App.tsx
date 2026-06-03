import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.js";
import Students from "./pages/Students.js";
import StudentDetail from "./pages/StudentDetail.js";
import Colleges from "./pages/Colleges.js";
import CollegeDetail from "./pages/CollegeDetail.js";
import BotConfig from "./pages/BotConfig.js";
import Chats from "./pages/Chats.js";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/students" replace />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/:chatId" element={<StudentDetail />} />
        <Route path="/colleges" element={<Colleges />} />
        <Route path="/colleges/:id" element={<CollegeDetail />} />
        <Route path="/config/bot" element={<BotConfig />} />
        <Route path="/chats" element={<Chats />} />
      </Routes>
    </Layout>
  );
}
