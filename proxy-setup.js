// proxy-setup.js
const { Dispatcher, ProxyAgent, setGlobalDispatcher } = require("undici");
const net = require("net");

class FailoverProxyAgent extends Dispatcher {
  constructor(primaryUri, backupUri) {
    super();
    this.primaryAgent = new ProxyAgent({ uri: primaryUri });
    this.backupAgent = new ProxyAgent({ uri: backupUri });
    this.primaryUri = primaryUri;
    this.backupUri = backupUri;
    this.useBackup = false;
    
    // Start periodic background check for primary proxy status
    this.startHealthCheck();
  }

  startHealthCheck() {
    const check = () => {
      try {
        const url = new URL(this.primaryUri);
        const port = parseInt(url.port) || 80;
        const host = url.hostname;
        
        const socket = net.createConnection({ port, host, timeout: 2000 }, () => {
          if (this.useBackup) {
            console.log(`[Proxy Failover] Primary proxy ${this.primaryUri} is back online. Switching back.`);
            this.useBackup = false;
          }
          socket.end();
        });

        socket.on('error', () => {
          if (!this.useBackup) {
            console.warn(`[Proxy Failover] Primary proxy ${this.primaryUri} healthcheck failed. Using backup ${this.backupUri}.`);
            this.useBackup = true;
          }
          socket.destroy();
        });

        socket.on('timeout', () => {
          if (!this.useBackup) {
            console.warn(`[Proxy Failover] Primary proxy ${this.primaryUri} healthcheck timed out. Using backup ${this.backupUri}.`);
            this.useBackup = true;
          }
          socket.destroy();
        });
      } catch (e) {
        this.useBackup = true;
      }
    };

    // Check immediately
    check();
    // Then check every 10 seconds
    setInterval(check, 10000).unref();
  }

  dispatch(options, handler) {
    const isUsingBackup = this.useBackup;
    const agent = isUsingBackup ? this.backupAgent : this.primaryAgent;
    
    const self = this;
    const wrappedHandler = Object.create(handler);
    wrappedHandler.onError = function(err) {
      const isConnectionError = 
        err.code === 'ECONNREFUSED' || 
        err.code === 'ETIMEDOUT' || 
        err.name === 'ConnectTimeoutError' || 
        err.code === 'ENOTFOUND' ||
        err.code === 'EHOSTUNREACH';

      if (!isUsingBackup && isConnectionError) {
        console.warn(`[Proxy Failover] Connection failed using primary proxy. Retrying with backup proxy ${self.backupUri}. Error:`, err.message);
        self.useBackup = true;
        
        try {
          self.backupAgent.dispatch(options, handler);
          return;
        } catch (retryErr) {
          handler.onError(retryErr);
          return;
        }
      }
      handler.onError(err);
    };

    return agent.dispatch(options, wrappedHandler);
  }
}

const primary = process.env.PRIMARY_PROXY || "http://169.254.1.1:8080/";
const backup = process.env.BACKUP_PROXY || "http://172.16.0.1:8080/";

console.log(`[Proxy Monitor] Initializing proxy with primary: ${primary} and backup: ${backup}`);
setGlobalDispatcher(new FailoverProxyAgent(primary, backup));

// Export proxy variables for any spawned subprocesses or other libraries
process.env.http_proxy = primary;
process.env.https_proxy = primary;
process.env.HTTP_PROXY = primary;
process.env.HTTPS_PROXY = primary;

