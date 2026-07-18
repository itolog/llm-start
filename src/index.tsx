import React from "react";

import { render } from "ink";

import { App } from "./app";
import { ErrorBoundary } from "./components/error-boundary";

render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
