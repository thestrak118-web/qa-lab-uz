import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./theme.css";
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>Oynani yuklashda xato</h1>
        <p>Saqlangan mashqlar o‘chirilmagan. Sahifani yangilab ko‘ring.</p>
        <pre>{this.state.error.message}</pre>
        <button onClick={() => location.reload()}>Qayta ochish</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
