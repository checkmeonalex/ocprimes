// proxy-setup.js
const { EnvHttpProxyAgent, setGlobalDispatcher } = require("undici");

setGlobalDispatcher(new EnvHttpProxyAgent());

console.log("Proxy loaded:", {
  http_proxy: process.env.http_proxy,
  https_proxy: process.env.https_proxy,
});



// how to start server on proxy
// export http_proxy=http://169.254.1.1:8080/
// export https_proxy=http://169.254.1.1:8080/
// export HTTP_PROXY=$http_proxy
// export HTTPS_PROXY=$https_proxy
// export NO_PROXY=localhost,127.0.0.1,::1,10.193.97.146
// export no_proxy=$NO_PROXY

// NODE_OPTIONS="--require ./proxy-setup.js" npm run dev
