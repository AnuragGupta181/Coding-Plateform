module.exports = {
  apps: [
    {
      name: "coding-platform-api",
      script: "./index.js",
      instances: 1, // Change to "max" to use all CPU cores in cluster mode
      autorestart: true, // Automatically restart if the app crashes
      watch: false,
      max_memory_restart: "1G", // Restart if it uses more than 1GB of RAM
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    }
  ]
};
