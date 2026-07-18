import React, { Component } from "react";

import { Box, Text } from "ink";

import { ErrorBoundaryProps, ErrorBoundaryState } from "./error-boundary.type";

// A render crash (e.g. corrupt message state) would otherwise tear down the
// whole Ink app with a raw stack trace. This catches it and shows a contained
// fallback card so the terminal stays legible. Must be a class component —
// React error boundaries have no hook equivalent.
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="red"
        paddingX={1}>
        <Text color="red" bold>
          Something went wrong
        </Text>
        <Text>{error.message}</Text>
        <Text dimColor>Press Ctrl+C to exit.</Text>
      </Box>
    );
  }
}
