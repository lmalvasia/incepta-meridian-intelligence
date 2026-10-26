import { healthResponseSchema } from "@meridian/contracts";
import { useEffect, useState } from "react";

type ApiState = "checking" | "reachable" | "unreachable";

export function App() {
  const [state, setState] = useState<ApiState>("checking");

  useEffect(() => {
    const controller = new AbortController();
    const configured = import.meta.env.VITE_API_URL;
    const baseUrl = (configured && configured.length > 0 ? configured : "http://localhost:3001").replace(
      /\/$/,
      "",
    );

    fetch(`${baseUrl}/health`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          setState("unreachable");
          return;
        }

        const body: unknown = await response.json();
        setState(healthResponseSchema.safeParse(body).success ? "reachable" : "unreachable");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setState("unreachable");
      });

    return () => {
      controller.abort();
    };
  }, []);

  const label =
    state === "checking" ? "Checking API…" : state === "reachable" ? "API reachable" : "API unreachable";

  return (
    <main>
      <h1>Meridian Intelligence</h1>
      <p>Local prototype foundation. Revenue, customer risk, and data-quality results are not computed yet.</p>
      <p>{label}</p>
    </main>
  );
}
