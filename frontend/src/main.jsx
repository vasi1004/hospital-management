import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AppLoaderHost } from "@/components/AppLoaderHost";
import { OfflinePlayHost } from "@/components/OfflinePlayHost";
import { store } from "./store";
import "./styles/global.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <AppLoaderHost />
        <OfflinePlayHost />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
