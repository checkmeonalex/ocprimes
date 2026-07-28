// proxy-setup.js
const { Agent, ProxyAgent, Dispatcher, setGlobalDispatcher } = require("undici");

const primary = process.env.PRIMARY_PROXY || "http://169.254.1.1:8080/";

console.log(`[Proxy Monitor] Initializing proxy: ${primary}`);

const NO_PROXY_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

class LocalBypassAgent extends Dispatcher {
  constructor(proxyUri) {
    super();
    // The proxy rejects (502) any request targeting localhost, whether
    // CONNECT-tunneled or forwarded plain-HTTP — treat it like a normal
    // NO_PROXY exclusion and dispatch those requests directly instead.
    this.proxyAgent = new ProxyAgent({ uri: proxyUri, proxyTunnel: false });
    this.directAgent = new Agent();
  }

  dispatch(options, handler) {
    const origin = String(options.origin || '');
    let hostname = '';
    try {
      hostname = new URL(origin).hostname;
    } catch {
      hostname = '';
    }

    const agent = NO_PROXY_HOSTS.has(hostname) ? this.directAgent : this.proxyAgent;
    return agent.dispatch(options, handler);
  }
}

setGlobalDispatcher(new LocalBypassAgent(primary));

// Export proxy variables for any spawned subprocesses or other libraries
process.env.http_proxy = primary;
process.env.https_proxy = primary;
process.env.HTTP_PROXY = primary;
process.env.HTTPS_PROXY = primary;
process.env.no_proxy = 'localhost,127.0.0.1,::1';
process.env.NO_PROXY = 'localhost,127.0.0.1,::1';
