// proxy-setup.js
const { EnvHttpProxyAgent, setGlobalDispatcher } = require("undici");

setGlobalDispatcher(new EnvHttpProxyAgent());

console.log("Proxy loaded:", {
  http_proxy: process.env.http_proxy,
  https_proxy: process.env.https_proxy,
});