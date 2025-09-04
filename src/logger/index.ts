import chalk from "chalk";
import { type AIMessageChunk } from "@langchain/core/messages";

export const logStatistics = (res: AIMessageChunk) => {
  const labelColor = "magenta";
  const resColor = "blueBright";
  const modelTime = res.response_metadata?.total_duration
    ? `🎯 ${(res.response_metadata.total_duration / 1000000000).toFixed(1)}s`
    : null;

  const model = res.response_metadata?.model ?? "N/A";

  console.log(chalk.gray("─".repeat(50)));
  console.log(
    chalk[labelColor]("⏱️ Response time:"),
    chalk[resColor].bold(`${modelTime}`),
  );

  console.log(chalk[labelColor]("⏱️ Model:"), chalk[resColor].bold(`${model}`));

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
