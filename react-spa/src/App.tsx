"use client";
import {
  FC,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Tldraw,
  createTLStore,
  getSnapshot,
  loadSnapshot,
  throttle,
  Editor,
} from "tldraw";
import "tldraw/tldraw.css";
import { Core } from "models";
import consola from "consola";
import { generateId } from "../lib/getId";
import { getUniqueName } from "../lib/generateName";
import { useWs } from "../composables/wsClient";
import { AnimatedSubscribeButton } from "../components/magicui/animated-subscribe-button";
import { CheckIcon, ChevronRightIcon, Loader, RefreshCcw } from "lucide-react";
import Meteors from "../components/magicui/meteors";
import LinearGradient from "../components/magicui/linear-gradient";

const PERSISTENCE_KEY = "example-3";

const App: FC = () => {
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const storeRef = useRef(createTLStore());
  const editorRef = useRef<Editor | null>(null);
  const [, forceUpdate] = useState({});

  const [id, setId] = useState(
    () => paramId || localStorage.getItem("id") || generateId(),
  );
  const [isShared, setIsShared] = useState(() => !!paramId);
  const [isHost, setIsHost] = useState(() => {
    const storedIsHost = localStorage.getItem("isHost") === "true";
    return paramId ? searchParams.get("host") === "true" : storedIsHost;
  });
  const [uniqueName, setUniqueName] = useState(
    () => localStorage.getItem("uniqueName") || getUniqueName(),
  );

  const [isHostAvailable, setIsHostAvailable] = useState<
    "available" | "unavailable" | "unknown"
  >("unknown");

  const [loadingState, setLoadingState] = useState<
    | { status: "loading" }
    | { status: "ready" }
    | { status: "error"; error: string }
  >({ status: "loading" });

  const [isWsReady, wsMessage, sendWsMessage, disconnect] = useWs(
    "ws://localhost:8080",
    id,
    isShared,
  );

  const broadcastChannelRef = useRef<BroadcastChannel | null>(
    typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("tldraw-sync")
      : null,
  );

  useEffect(() => {
    fetch("http://localhost:8000")
      .then((res) => {
        if (res.ok) {
          setIsHostAvailable("available");
        } else {
          setIsHostAvailable("unavailable");
        }
      })
      .catch(() => {
        setIsHostAvailable("unavailable");
      });
  });

  useEffect(() => {
    if (paramId) {
      setId(paramId);
      setIsShared(true);
      setIsHost(searchParams.get("host") === "true");
    } else {
      setIsShared(false);
    }
  }, [paramId, searchParams]);

  useEffect(() => {
    localStorage.setItem("id", id);
    localStorage.setItem("isHost", String(isHost));
    localStorage.setItem("uniqueName", uniqueName);

    if (isShared) {
      setSearchParams({ host: String(isHost) });
    }
  }, [id, isHost, uniqueName, isShared, setSearchParams]);

  useEffect(() => {
    if (editorRef.current) {
      const isReadonly = isShared ? !isHost : false;
      editorRef.current.updateInstanceState({ isReadonly });
    }
  }, [isHost, isShared]);

  const applySnapshot = useCallback((snapshot: any) => {
    loadSnapshot(storeRef.current, snapshot);
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(snapshot));
    forceUpdate({});
  }, []);

  useEffect(() => {
    if (isWsReady) {
      console.log("WebSocket connected");
    }
  }, [isWsReady]);

  useEffect(() => {
    const channel = broadcastChannelRef.current;
    if (channel) {
      const handleMessage = (event: MessageEvent) => {
        consola.info("Received message", event.data);
        if (event.data.type === "snapshot") {
          console.log(event.data.uniqueName);
          applySnapshot(event.data.snapshot);
        }
      };
      channel.addEventListener("message", handleMessage);
      return () => {
        channel.removeEventListener("message", handleMessage);
      };
    }
  }, [applySnapshot]);

  useEffect(() => {
    if (!isShared) {
      disconnect();
    }
  }, [isShared, disconnect]);

  useLayoutEffect(() => {
    setLoadingState({ status: "loading" });

    const persistedSnapshot = localStorage.getItem(PERSISTENCE_KEY);

    if (persistedSnapshot) {
      try {
        const snapshot = JSON.parse(persistedSnapshot);
        loadSnapshot(storeRef.current, snapshot);
        setLoadingState({ status: "ready" });
      } catch (error: any) {
        setLoadingState({ status: "error", error: error.message });
      }
    } else {
      setLoadingState({ status: "ready" });
    }

    const cleanupFn = storeRef.current.listen(
      throttle(() => {
        const snapshot = getSnapshot(storeRef.current);
        localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(snapshot));

        if (isHost && isShared) {
          sendUpdate(snapshot);
        }
      }, 500),
    );

    return () => {
      cleanupFn();
    };
  }, [isHost, isShared]);

  const sendUpdate = useCallback(
    (snapshot: any) => {
      if (!isShared) return;
      const payload = {
        auth: {
          isParent: true,
          userId: id,
        },
        data: JSON.stringify({
          type: "snapshot",
          uniqueName: uniqueName,
          snapshot,
        }),
      } satisfies Core;

      try {
        sendWsMessage(payload);
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: "snapshot",
            snapshot,
          });
        }
        consola.success("Data sent successfully");
      } catch (error) {
        console.error("Error sending data:", error);
      }
    },
    [sendWsMessage, id, uniqueName, isShared],
  );

  const handleHostChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newIsHost = event.target.checked;
      setIsHost(newIsHost);
      if (isShared) {
        setSearchParams({ host: String(newIsHost) });
        if (newIsHost) {
          console.log("Host mode enabled");
          sendUpdate(getSnapshot(storeRef.current));
        } else {
          console.log("Host mode disabled");
        }
      }
    },
    [isShared, setSearchParams, sendUpdate],
  );

  const handleShareClick = useCallback(() => {
    setIsShared((prevIsShared) => {
      const newIsShared = !prevIsShared;
      if (newIsShared) {
        const newId = generateId();
        setId(newId);
        navigate(`/${newId}?host=true`);
        setIsHost(true); // Set as host when starting to share
      } else {
        navigate("/");
        setIsHost(false); // Reset host status when stopping sharing
      }
      return newIsShared;
    });
  }, [navigate]);

  const regenerateUniqueName = useCallback(() => {
    const newName = getUniqueName();
    setUniqueName(newName);
  }, []);

  useEffect(() => {
    if (wsMessage) {
      try {
        const parsedData1 = JSON.parse(wsMessage).data;
        const data = JSON.parse(parsedData1);
        if (data.type === "snapshot") {
          if (data.uniqueName !== uniqueName) {
            setIsHost(false);
            applySnapshot(data.snapshot);
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket data:", error);
      }
    }
  }, [wsMessage, applySnapshot, uniqueName]);

  if (loadingState.status === "loading") {
    return (
      <div className="tldraw__editor">
        <h2>Loading...</h2>
      </div>
    );
  }

  if (loadingState.status === "error") {
    return (
      <div className="tldraw__editor">
        <h2>Error!</h2>
        <p>{loadingState.error}</p>
      </div>
    );
  }

  const HandleRight = () => {
    if (isHostAvailable == "available") {
      return (
        <div className="flex items-center justify-center space-x-4">
          {isShared && (
            <>
              <label className="inline-flex cursor-pointer items-center">
                <span className="me-3 text-sm font-light text-gray-900">
                  Become Host
                </span>
                <input
                  type="checkbox"
                  checked={isHost}
                  onChange={handleHostChange}
                  className="peer sr-only"
                />
                <div className="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rtl:peer-checked:after:-translate-x-full dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"></div>
              </label>
              <code
                className="transition-transform duration-300"
                style={{ fontSize: "0.75rem" }}
              >
                {id}
              </code>
            </>
          )}
          <AnimatedSubscribeButton
            buttonColor="#000000"
            buttonTextColor="#ffffff"
            subscribeStatus={isShared}
            onSubscribeChange={handleShareClick}
            initialText={
              <span className="group inline-flex items-center">
                Share
                <ChevronRightIcon className="ml-1 h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            }
            changeText={
              <span className="group inline-flex items-center">
                <CheckIcon className="mr-2 h-3 w-3" />
                Stop Sharing
              </span>
            }
          />
        </div>
      );
    }

    if (isHostAvailable === "unavailable") {
      return (
        <div className="flex items-center justify-center space-x-4">
          <div
            className="rounded
            bg-gradient-to-r
            from-red-400 
            p-2
            font-semibold
            text-gray-800
          "
          >
            Kafka Server Unavialable 💀
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center space-x-4">
        <div
          className="rounded
          p-3
          font-semibold
          text-gray-800"
        >
          <div>
            <Loader className="h-4 w-4 animate-spin text-gray-800" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-400 p-1 px-2 py-3">
        <LinearGradient />
        <div className="bg-background bordermd:shadow-xl relative flex items-center justify-center overflow-hidden rounded-lg">
          <Meteors number={50} />
          <p className="z-10 w-full whitespace-pre-wrap pb-1 pl-2 pr-5 text-center font-medium tracking-tighter text-black">
            The Board
          </p>
        </div>
        <div className="flex gap-2">
          <p>{uniqueName}</p>
          <div
            className="flex cursor-pointer items-center justify-center rounded-md p-1 transition-colors duration-300 ease-in-out hover:bg-gray-100"
            onClick={regenerateUniqueName}
          >
            <RefreshCcw className="h-3 w-3 text-gray-800" />
          </div>
        </div>
        <HandleRight />
      </div>
      <div style={{ position: "absolute", inset: 0 }} className="mt-[3.75rem]">
        <Tldraw
          onMount={(editor) => {
            editorRef.current = editor;
            const isReadonly = isShared ? !isHost : false;
            editor.updateInstanceState({ isReadonly });
          }}
          store={storeRef.current}
        />
      </div>
    </div>
  );
};

export default App;
