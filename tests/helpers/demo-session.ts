/** Explicit signed-in fixture for workflow tests that previously assumed a demo login. */
export function authenticateDemoFixture() {
  window.localStorage.setItem("5s-auth-session", JSON.stringify({ authenticated: true, username: "admin", version: 1 }));
}
