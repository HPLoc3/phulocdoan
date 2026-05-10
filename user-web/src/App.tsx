import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SWRConfig } from "swr";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { MyTicketsPage } from "./pages/MyTicketsPage";
import { AuthProvider } from "./auth/AuthContext";

// Global fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

function App() {
  return (
    <SWRConfig value={{ fetcher }}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/my-tickets" element={<MyTicketsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </SWRConfig>
  );
}

export default App;
