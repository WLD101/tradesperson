import { spawn, spawnSync } from "node:child_process";
import { access, readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const prismaClientPackageDir = path.dirname(
  require.resolve("@prisma/client/package.json"),
);
const prismaClientDir = path.resolve(
  prismaClientPackageDir,
  "../.prisma/client",
);
const pnpmCjs =
  process.platform === "win32" && process.env.APPDATA
    ? path.join(process.env.APPDATA, "npm", "node_modules", "pnpm", "bin", "pnpm.cjs")
    : null;

function buildLocalTestDatabaseUrl(databaseName) {
  const url = new URL(`postgresql://localhost:55432/${databaseName}`);
  url.username = "postgres";
  url.password = "postgres";
  return url.toString();
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function waitForHealth(url, maxRetries = 120, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          clearInterval(interval);
          resolve();
        }
      } catch (err) {
        if (retries % 5 === 0) console.log(`[runner] Health check failed: ${err.message}`);
      }
      retries++;
      if (retries >= maxRetries) {
        clearInterval(interval);
        reject(
          new Error(
            `Timeout waiting for API health after ${maxRetries * intervalMs}ms`,
          ),
        );
      }
    }, intervalMs);
  });
}

function killProcessTree(child, signal = "SIGTERM") {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    });
    return;
  }
  child.kill(signal);
}

function waitForCloseWithTimeout(child, label, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      killProcessTree(child, "SIGKILL");
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
}

function waitForClose(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    child.once("close", resolve);
  });
}

function spawnPnpm(args, options = {}) {
  const command = pnpmCjs ?? "pnpm";
  const commandArgs = pnpmCjs ? [pnpmCjs, ...args] : args;
  return spawn(pnpmCjs ? process.execPath : command, commandArgs, {
    ...options,
    shell: false,
  });
}

async function prismaClientIsReady() {
  try {
    await access(path.join(prismaClientDir, "index.js"));
    await access(path.join(prismaClientDir, "query_engine-windows.dll.node"));
    return true;
  } catch {
    return false;
  }
}

async function removeStalePrismaTempFiles() {
  try {
    const entries = await readdir(prismaClientDir, { withFileTypes: true });
    await Promise.all(
      entries
        .filter(
          (entry) =>
            entry.isFile() &&
            entry.name.startsWith("query_engine-windows.dll.node.tmp"),
        )
        .map((entry) => rm(path.join(prismaClientDir, entry.name), { force: true })),
    );
  } catch {
    // Best-effort cleanup only.
  }
}

async function main() {
  if (process.env.NODE_ENV !== "test") {
    process.env.NODE_ENV = "test";
  }

  const databaseUrl = process.env.DATABASE_URL || buildLocalTestDatabaseUrl("tradesperson_erp_isolation_test");
  
  if (!databaseUrl.includes("_test")) {
    console.error("Refusing to run against non-test database URL:", databaseUrl);
    process.exit(1);
  }

  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = databaseUrl;
  process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
  process.env.WEB_URL = process.env.WEB_URL || "http://localhost:3000";
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-value-1234567890";
  process.env.AUTH_ISSUER = process.env.AUTH_ISSUER || "tradesperson-net-erp-test";
  process.env.AUTH_AUDIENCE = process.env.AUTH_AUDIENCE || "tradesperson-erp-test-users";
  process.env.COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || "localhost";
  process.env.S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:9000";
  process.env.S3_REGION = process.env.S3_REGION || "us-east-1";
  process.env.S3_BUCKET = process.env.S3_BUCKET || "test-bucket";
  process.env.S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || "minioadmin";
  process.env.S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || "minioadmin";
  process.env.SMTP_HOST = process.env.SMTP_HOST || "localhost";
  process.env.SMTP_PORT = process.env.SMTP_PORT || "1025";
  process.env.MAIL_FROM = process.env.MAIL_FROM || "noreply@example.com";

  const port = await getAvailablePort();
  const apiHost = "127.0.0.1";
  const apiUrl = `http://${apiHost}:${port}`;
  const suiteTimeoutMs = Number(process.env.ISOLATION_TIMEOUT_MS || 900000);
  
  process.env.PORT = port.toString();
  process.env.API_URL = apiUrl;
  process.env.INTERNAL_API_URL = apiUrl;
  const apiEnv = { ...process.env };

  console.log(`[runner] Using test port ${port}`);

  let apiProcess;
  let terminatingApi = false;
  try {
    console.log(`[runner] Resetting test database using real migrations...`);
    const dbReset = spawnPnpm(
      [
        "--filter",
        "@tradesperson/db",
        "exec",
        "prisma",
        "migrate",
        "reset",
        "--force",
        "--skip-generate",
      ],
      { stdio: "inherit", env: apiEnv },
    );
    const dbResetCode = await waitForCloseWithTimeout(
      dbReset,
      "Database migration reset",
      180000,
    );
    if (dbResetCode !== 0) {
      throw new Error(`Database migration failed with code ${dbResetCode}`);
    }

    await removeStalePrismaTempFiles();
    if (await prismaClientIsReady()) {
      console.log(`[runner] Reusing existing prisma client; skipping generate.`);
    } else {
      console.log(`[runner] Generating prisma client (with retry)...`);
      let generated = false;
      let generateRetries = 0;
      while (!generated && generateRetries < 5) {
        const dbGen = spawnPnpm(
          ["--filter", "@tradesperson/db", "exec", "prisma", "generate"],
          { stdio: "inherit", env: apiEnv },
        );
        const code = await waitForCloseWithTimeout(
          dbGen,
          "Prisma generate",
          120000,
        );
        if (code === 0) {
          generated = true;
        } else {
          generateRetries++;
          console.warn(`[runner] Prisma generate failed (attempt ${generateRetries}/5). Retrying in 2 seconds...`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      if (!generated) throw new Error("Database generate failed after 5 attempts");
    }

    console.log(`[runner] Starting API...`);
    const entrypoint = "dist/apps/api/src/main.js";
    
    apiProcess = spawn("node", [entrypoint], {
      stdio: "inherit",
      env: apiEnv,
    });

    apiProcess.on("error", (err) => {
      console.error("[runner] API process failed to start", err);
      process.exit(1);
    });
    apiProcess.on("exit", (code, signal) => {
      if (terminatingApi) return;
      if (code !== null && code !== 0) {
        console.error(`[runner] API process exited early with code ${code}`);
      } else if (signal) {
        console.error(`[runner] API process exited early with signal ${signal}`);
      }
    });

    console.log(`[runner] Waiting for API health...`);
    await waitForHealth(`${apiUrl}/api/v1/health`);

    console.log(`[runner] API is healthy. Starting isolation suite...`);
    const runner = spawnPnpm(["exec", "tsx", "test/tenant-isolation.runner.ts", "--no-recreate"], {
      stdio: "inherit",
      env: apiEnv,
    });

    const code = await waitForCloseWithTimeout(
      runner,
      "Tenant isolation suite",
      suiteTimeoutMs,
    );

    if (code !== 0) {
      console.error(`[runner] Suite failed with code ${code}`);
      process.exitCode = code;
    } else {
      console.log(`[runner] Suite passed!`);
    }

  } catch (err) {
    console.error("[runner] Orchestrator error:", err);
    process.exitCode = 1;
  } finally {
    if (apiProcess) {
      console.log(`[runner] Terminating API process...`);
      terminatingApi = true;
      killProcessTree(apiProcess, "SIGTERM");
      
      const timeout = setTimeout(() => {
        console.log(`[runner] Force killing API process...`);
        killProcessTree(apiProcess, "SIGKILL");
      }, 5000);

      await waitForClose(apiProcess);
      clearTimeout(timeout);
      console.log(`[runner] API process terminated`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
