import { Refine } from "@refinedev/core";
import { Layout, ErrorComponent, ThemedLayoutV2 } from "@refinedev/antd";
import routerBindings, { NavigateToResource, UnsavedChangesNotifier } from "@refinedev/react-router-v6";
import dataProvider from "@refinedev/simple-rest";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import { ConfigProvider } from "antd";
import "@refinedev/antd/dist/reset.css";

import { EventList } from "./pages/events/list";
import { EventCreate } from "./pages/events/create";
import { EventEdit } from "./pages/events/edit";
import { BookingList } from "./pages/bookings/list";

const API_URL = "http://localhost:8000/api/v1";

function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={{ token: { colorPrimary: '#00b96b' } }}>
        <Refine
          dataProvider={dataProvider(API_URL)}
          routerProvider={routerBindings}
          resources={[
            {
              name: "events",
              list: "/events",
              create: "/events/create",
              edit: "/events/edit/:id",
            },
            {
              name: "bookings",
              list: "/bookings",
            },
            {
              name: "venues",
            },
          ]}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
          }}
        >
          <Routes>
            <Route
              element={
                <ThemedLayoutV2>
                  <Outlet />
                </ThemedLayoutV2>
              }
            >
              <Route index element={<NavigateToResource resource="events" />} />
              <Route path="/events">
                <Route index element={<EventList />} />
                <Route path="create" element={<EventCreate />} />
                <Route path="edit/:id" element={<EventEdit />} />
              </Route>
              <Route path="/bookings">
                <Route index element={<BookingList />} />
              </Route>
              <Route path="*" element={<ErrorComponent />} />
            </Route>
          </Routes>
          <UnsavedChangesNotifier />
        </Refine>
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
