import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./theme.css";

// Standard TanStack QueryClient (the Hatch SDK's shared client is gone
// with the re-platforming). Conservative defaults: a couple of retries
// for transient failures, no refetch storm on window focus.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 0, refetchOnWindowFocus: false },
  },
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("missing #root element");

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <div className="app-root">
        <App />
      </div>
    </QueryClientProvider>
  </StrictMode>,
);
