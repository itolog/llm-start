interface Config {
  MODEL: string | undefined;
  TEMP: number | undefined;
}

export const config: Config = {
  MODEL: process.env.MODEL,
  TEMP: Number(process.env.TEMP),
};
