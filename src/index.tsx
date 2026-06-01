import React, { useState } from "react";
import { render, Text, Box } from "ink";
import TextInput from "ink-text-input";
import llm from "./llmModel/index.js";
import { prompt } from "./llmModel/messages.js";
import { cleanText } from "./helpers/index.js";

const App = () => {
  const [input, setInput] = useState("");
  const [fromLang, setFromLang] = useState("english");
  const [toLang, setToLang] = useState("polish");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    {
      role: "Bot",
      text: "Hello! I am a TUI translator. Use /from <lang> and /to <lang> to change settings.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();

    if (userText.startsWith("/from ")) {
      const newLang = userText.replace("/from ", "").trim().toLowerCase();
      setFromLang(newLang);
      setMessages((prev) => [
        ...prev,
        { role: "Bot", text: `Source language changed to: ${newLang}` },
      ]);
      setInput("");
      return;
    }

    if (userText.startsWith("/to ")) {
      const newLang = userText.replace("/to ", "").trim().toLowerCase();
      setToLang(newLang);
      setMessages((prev) => [
        ...prev,
        { role: "Bot", text: `Target language changed to: ${newLang}` },
      ]);
      setInput("");
      return;
    }

    setMessages((prev) => [...prev, { role: "You", text: userText }]);
    setInput("");
    setIsLoading(true);

    try {
      const chatPrompt = prompt.pipe(llm);
      const res = await chatPrompt.invoke({
        input_language: fromLang,
        output_language: toLang,
        input: userText,
      });

      setMessages((prev) => [
        ...prev,
        { role: "Bot", text: cleanText(res.text) },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "Bot",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="green" bold>
        --- LLM Translator TUI ---
      </Text>
      <Box backgroundColor="gray">
        <Text>
          Settings: {fromLang} ➔ {toLang}{" "}
        </Text>
      </Box>
      <Box flexDirection="column" marginY={1}>
        {messages.map((msg, i) => (
          <Text key={i}>
            <Text color={msg.role === "Bot" ? "cyan" : "magenta"} bold>
              {msg.role}:{" "}
            </Text>
            {msg.text}
          </Text>
        ))}
        {isLoading && <Text color="gray">Translating...</Text>}
      </Box>
      <Box>
        <Text color="yellow">&gt; </Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
};

render(<App />);
