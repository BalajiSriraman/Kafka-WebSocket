import { useState, useRef, useEffect, useCallback } from "react";
import { coreSchema, type Core } from "../models";

export const useWs = (url: string | null, id: string | null, shouldConnect: boolean): [boolean, any, (data: any) => void, () => void] => {
  const [isReady, setIsReady] = useState(false);
  const [val, setVal] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);

  const send = useCallback((data: Core) => {
    // Check if id is a non-empty string and the connection is ready
    if (typeof id != 'string' || id.trim() === '') {
      console.error("ID df", id);
      return;
    }

    const parsedData = coreSchema.safeParse(data);

    if (!parsedData.success) {
      console.error("Invalid data:", parsedData.error);
      return;
    }

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(parsedData.data));
    } else {
      console.error("WebSocket connection not open.");
    }
  }, [id, isReady]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsReady(false);
    setVal(null);
  }, []);

  useEffect(() => {
    if (url && shouldConnect && typeof id === 'string' && id.trim() !== '') {
      const wsInstance = new WebSocket(url);

      wsInstance.addEventListener("open", () => {
        setIsReady(true);

        const payload = {
          type: "identify",
          userId: id
        };
        wsInstance.send(JSON.stringify(payload));
      });

      wsInstance.addEventListener("message", (event) => {
        setVal(event.data);
      });

      wsInstance.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
      });

      ws.current = wsInstance;

      return () => {
        wsInstance.close();
        setIsReady(false);
      };
    } else {
      disconnect();
    }
  }, [url, id, disconnect, shouldConnect]);

  return [isReady, val, send, disconnect];
};