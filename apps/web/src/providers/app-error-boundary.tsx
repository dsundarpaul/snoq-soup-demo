"use client";

import React from "react";
import { RouteErrorFallback } from "@/sections/common/route-error-fallback";

type Props = { children: React.ReactNode };

type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <RouteErrorFallback
          error={this.state.error}
          reset={this.reset}
          title="Something went wrong"
          description="The app hit an error. Try again to continue."
        />
      );
    }
    return this.props.children;
  }
}
