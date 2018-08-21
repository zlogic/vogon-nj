const PROXY_CONFIG = [
  {
      context: [
        '/configuration', '/oauth', '/service', '/register', '/images',
        '/login', '/transactions', '/accounts', '/analytics', '/usersettings', '/intro'
      ],
      target: 'http://localhost:3000',
      secure: false
  }
]

module.exports = PROXY_CONFIG;