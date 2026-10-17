module.exports = {
  apps: [
    {
      name: 'floaty-shooter',
      script: './server.js',
      instances: 'max', // Utilizes all available CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        CLUSTER: 'false' // When using PM2, PM2 manages the cluster
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        CLUSTER: 'false'
      }
    }
  ]
};
