import chalk from "chalk";
import { type AIMessageChunk } from "@langchain/core/messages";

export const logStatistics = (res: AIMessageChunk, responseTime: number) => {
  const labelColor = "magenta";
  const resColor = "blueBright";

  console.log(chalk.gray("─".repeat(50)));
  console.log(
    chalk[labelColor]("⏱️ Response time:"),
    chalk[resColor].bold(`${responseTime}ms`),
  );

  if (res.usage_metadata) {
    const { input_tokens, output_tokens, total_tokens } = res.usage_metadata;
    console.log(
      chalk[labelColor]("🔢 Input tokens:"),
      chalk[resColor].bold(input_tokens || "N/A"),
    );
    console.log(
      chalk[labelColor]("🔢 Output tokens:"),
      chalk[resColor].bold(output_tokens || "N/A"),
    );
    console.log(
      chalk[labelColor]("🔢 Total tokens:"),
      chalk[resColor].bold(total_tokens || "N/A"),
    );
  }
  console.log(chalk.gray("─".repeat(50)));
};
