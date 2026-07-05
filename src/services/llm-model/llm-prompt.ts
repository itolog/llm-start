import { ChatPromptTemplate } from "@langchain/core/prompts";

export const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a professional translation engine. Translate the following text from {input_language} to {output_language}.\n\n" +
      "STRICT RULES:\n" +
      "1. Provide ONLY the translated text.\n" +
      "2. Do NOT include explanations, notes, alternatives, or transliterations.\n" +
      "3. Maintain the original tone, style, and formatting.\n" +
      "4. Do NOT wrap the translation in quotes or markers unless they were in the source text.\n" +
      "5. If the text is already in the target language, return it as is.",
  ],
  ["human", "{input}"],
]);
