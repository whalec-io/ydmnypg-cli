import Core from "@ydmnypg/core";

const config = new Core.AppConfig({
  mode: process.env.YS_API_MODE || process.env.NODE_ENV || "local",
});

config.registerConnections(config.getConnectionOptionsFromConfig());

export default config;
