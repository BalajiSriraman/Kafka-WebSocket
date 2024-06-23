"use client";
import { generateId } from "../lib/getId";
import { useState, useEffect, useCallback } from "react";
import { AnimatedSubscribeButton } from "./magicui/animated-subscribe-button";
import { CheckIcon, ChevronRightIcon, RefreshCcw } from "lucide-react";
import Meteors from "./magicui/meteors";
import LinearGradient from "../components/magicui/linear-gradient";
import { getUniqueName } from "../lib/generateName";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

export default function LogicBoard({
  onHostChange,
}: {
  onHostChange: (isHost: boolean) => void;
}) {
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

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
    onHostChange(isHost);
  }, [isHost, onHostChange]);

  const handleShareClick = useCallback(() => {
    setIsShared((prevIsShared) => {
      const newIsShared = !prevIsShared;
      if (newIsShared) {
        const newId = generateId();
        setId(newId);
        navigate(`/${newId}?host=${isHost}`);
      } else {
        navigate("/");
      }
      return newIsShared;
    });
  }, [navigate, isHost]);

  const handleHostChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newIsHost = event.target.checked;
      setIsHost(newIsHost);
      if (isShared) {
        setSearchParams({ host: String(newIsHost) });
      }
    },
    [isShared, setSearchParams],
  );
  const regenerateUniqueName = useCallback(() => {
    const newName = getUniqueName();
    setUniqueName(newName);
  }, []);

  return (
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
      {/* Share Action  */}
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
    </div>
  );
}
