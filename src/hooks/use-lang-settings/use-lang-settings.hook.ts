import { useState } from "react";

export function useLangSettings() {
  const [fromLang, setFromLang] = useState("english");
  const [toLang, setToLang] = useState("polish");

  return {
    fromLang,
    toLang,
    setFromLang,
    setToLang,
  };
}
