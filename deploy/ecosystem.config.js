module.exports = {
  apps: [
    {
      name: 'ximples-app',
      cwd: '/srv/projects/ximples/app',
      script: 'node_modules/.bin/next',
      args: 'start -p 3002',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: '/srv/projects/ximples/logs/pm2-app-error.log',
      out_file: '/srv/projects/ximples/logs/pm2-app-out.log',
    },
  ],
};
