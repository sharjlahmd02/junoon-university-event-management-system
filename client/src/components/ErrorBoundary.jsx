import { Component } from "react";

// Without this, any uncaught error during render anywhere in the tree
// unmounts the whole app to a blank white screen with nothing on screen
// to go on -- only the browser console shows anything, and only if
// someone thinks to open it. This turns that into a visible message
// (and still logs the real error/stack for debugging) instead of nothing.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 640, margin: "0 auto" }}>
          <h1 style={{ fontSize: 20 }}>Something broke on this page.</h1>
          <p>
            Open the browser console for the full error — this message exists so a broken page shows
            *something* instead of a silent blank screen.
          </p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f4f4f4", padding: 12, fontSize: 12 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;