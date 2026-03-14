module.exports = {
  apps: [
    {
      name: "coindcx-backend",
      script: "backend/src/server.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      out_file: "./logs/backend-out.log",
      error_file: "./logs/backend-error.log",
      time: true,
    },
    {
      name: "coindcx-frontend",
      script: "npm",
      args: "run start",
      cwd: __dirname + "/frontend",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:3001",
        NEXT_PUBLIC_WS_BASE_URL: "ws://127.0.0.1:3001/ws",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      out_file: "./logs/frontend-out.log",
      error_file: "./logs/frontend-error.log",
      time: true,
    },
  ],
};
