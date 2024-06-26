import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import "./index.css";
import Ripple from "./components/magicui/ripple";

const AppWithSplashScreen = () => {
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  const router = createBrowserRouter([
    {
      path: "/",
      element: <App />,
    },
    {
      path: "/:id",
      element: <App />,
    },
    {
      path: "about",
      element: <div>About</div>,
    },
  ]);

  useEffect(() => {
    setTimeout(() => {
      setShowSplashScreen(false);
    }, 3000);
  }, []);

  return (
    <>
      {showSplashScreen ? (
        <div className="bg-background relative flex h-screen w-screen items-center justify-center overflow-hidden rounded-lg border p-20 md:shadow-xl">
          <p className="z-10 whitespace-pre-wrap text-center text-4xl font-medium tracking-tighter text-zinc-800">
            The Board
          </p>
          <Ripple />
        </div>
      ) : (
        <RouterProvider router={router} />
      )}
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <AppWithSplashScreen />,
);
