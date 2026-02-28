import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'NectoProxy',
  description: 'A powerful HTTP/HTTPS debugging proxy with Web UI - open-source alternative to Charles Proxy and Fiddler',
  base: '/nectoproxy/',
  outDir: '../docs',
  ignoreDeadLinks: [
    /localhost/,
  ],

  head: [
    ['meta', { name: 'author', content: 'Sitharaj Seenivasan' }],
    ['meta', { name: 'keywords', content: 'proxy, http, https, debugging, mitm, charles proxy, fiddler, mitmproxy, network inspector' }],
    ['meta', { property: 'og:title', content: 'NectoProxy' }],
    ['meta', { property: 'og:description', content: 'A powerful HTTP/HTTPS debugging proxy with Web UI' }],
    ['meta', { property: 'og:type', content: 'website' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Features', link: '/features/' },
      { text: 'Rules', link: '/rules/' },
      { text: 'API', link: '/api/' },
      { text: 'Tutorials', link: '/guides/' },
      {
        text: 'More',
        items: [
          { text: 'FAQ', link: '/faq' },
          { text: 'Troubleshooting', link: '/troubleshooting/' },
          { text: 'Contributing', link: '/contributing/' },
          { text: 'Changelog', link: 'https://github.com/sitharaj88/nectoproxy/releases' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is NectoProxy?', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Comparison', link: '/guide/comparison' },
          ]
        }
      ],

      '/certificate/': [
        {
          text: 'Certificate Setup',
          items: [
            { text: 'Overview', link: '/certificate/' },
            { text: 'macOS', link: '/certificate/macos' },
            { text: 'Windows', link: '/certificate/windows' },
            { text: 'Linux', link: '/certificate/linux' },
            { text: 'Firefox', link: '/certificate/firefox' },
            { text: 'Mobile Devices', link: '/certificate/mobile' },
          ]
        }
      ],

      '/cli/': [
        {
          text: 'CLI Reference',
          items: [
            { text: 'Overview', link: '/cli/' },
            { text: 'nectoproxy start', link: '/cli/start' },
            { text: 'nectoproxy cert', link: '/cli/cert' },
            { text: 'nectoproxy sessions', link: '/cli/sessions' },
          ]
        }
      ],

      '/features/': [
        {
          text: 'Core Features',
          items: [
            { text: 'Overview', link: '/features/' },
            { text: 'Traffic Inspection', link: '/features/traffic-inspection' },
            { text: 'Rules Engine', link: '/features/rules-engine' },
            { text: 'Breakpoints', link: '/features/breakpoints' },
            { text: 'Network Conditioning', link: '/features/network-conditioning' },
          ]
        },
        {
          text: 'Protocol Support',
          items: [
            { text: 'WebSocket Support', link: '/features/websocket-support' },
            { text: 'SSL Passthrough', link: '/features/ssl-passthrough' },
            { text: 'DNS Mapping', link: '/features/dns-mapping' },
            { text: 'Upstream Proxy', link: '/features/upstream-proxy' },
          ]
        },
        {
          text: 'Analysis & Export',
          items: [
            { text: 'HAR Export/Import', link: '/features/har-export-import' },
            { text: 'Code Generation', link: '/features/code-generation' },
            { text: 'Request Replay', link: '/features/request-replay' },
            { text: 'Request Comparison', link: '/features/request-comparison' },
            { text: 'Security Scanning', link: '/features/security-scanning' },
            { text: 'Annotations', link: '/features/annotations' },
          ]
        },
        {
          text: 'UI Features',
          items: [
            { text: 'Sessions', link: '/features/sessions' },
            { text: 'Dashboard', link: '/features/dashboard' },
            { text: 'Search', link: '/features/search' },
            { text: 'Keyboard Shortcuts', link: '/features/keyboard-shortcuts' },
          ]
        }
      ],

      '/rules/': [
        {
          text: 'Rules',
          items: [
            { text: 'Overview', link: '/rules/' },
            { text: 'Mock', link: '/rules/mock' },
            { text: 'Block', link: '/rules/block' },
            { text: 'Modify Request', link: '/rules/modify-request' },
            { text: 'Modify Response', link: '/rules/modify-response' },
            { text: 'Map Local', link: '/rules/map-local' },
            { text: 'Map Remote', link: '/rules/map-remote' },
            { text: 'Delay', link: '/rules/delay' },
            { text: 'Throttle', link: '/rules/throttle' },
          ]
        }
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Traffic', link: '/api/traffic' },
            { text: 'Rules', link: '/api/rules' },
            { text: 'Breakpoints', link: '/api/breakpoints' },
            { text: 'Sessions', link: '/api/sessions' },
          ]
        },
        {
          text: 'Network & Proxy',
          items: [
            { text: 'Network Conditioning', link: '/api/network' },
            { text: 'SSL Passthrough', link: '/api/ssl-passthrough' },
            { text: 'DNS Mapping', link: '/api/dns' },
            { text: 'Upstream Proxy', link: '/api/upstream-proxy' },
          ]
        },
        {
          text: 'Data & Config',
          items: [
            { text: 'HAR Export/Import', link: '/api/har' },
            { text: 'Settings', link: '/api/settings' },
            { text: 'Certificates', link: '/api/certificates' },
            { text: 'WebSocket Frames', link: '/api/websocket' },
            { text: 'Annotations', link: '/api/annotations' },
            { text: 'Real-time Events', link: '/api/realtime-events' },
          ]
        }
      ],

      '/configuration/': [
        {
          text: 'Configuration',
          items: [
            { text: 'Overview', link: '/configuration/' },
            { text: 'Proxy Settings', link: '/configuration/proxy-settings' },
            { text: 'UI Settings', link: '/configuration/ui-settings' },
            { text: 'Storage & Database', link: '/configuration/storage' },
          ]
        }
      ],

      '/guides/': [
        {
          text: 'Tutorials',
          items: [
            { text: 'Overview', link: '/guides/' },
            { text: 'Mocking APIs', link: '/guides/mocking-apis' },
            { text: 'Debugging Mobile Apps', link: '/guides/debugging-mobile' },
            { text: 'Testing Error Handling', link: '/guides/testing-error-handling' },
            { text: 'Simulating Slow Networks', link: '/guides/simulating-slow-networks' },
            { text: 'Debugging WebSockets', link: '/guides/debugging-websockets' },
            { text: 'Chaining Proxies', link: '/guides/chaining-proxies' },
            { text: 'Exporting Traffic', link: '/guides/exporting-traffic' },
          ]
        }
      ],

      '/troubleshooting/': [
        {
          text: 'Troubleshooting',
          items: [
            { text: 'Overview', link: '/troubleshooting/' },
            { text: 'Common Issues', link: '/troubleshooting/common-issues' },
            { text: 'Certificate Errors', link: '/troubleshooting/certificate-errors' },
            { text: 'Port Conflicts', link: '/troubleshooting/port-conflicts' },
            { text: 'Performance', link: '/troubleshooting/performance' },
          ]
        }
      ],

      '/contributing/': [
        {
          text: 'Contributing',
          items: [
            { text: 'How to Contribute', link: '/contributing/' },
            { text: 'Development Setup', link: '/contributing/development-setup' },
            { text: 'Architecture', link: '/contributing/architecture' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sitharaj88/nectoproxy' },
      { icon: 'linkedin', link: 'https://linkedin.com/in/sitharaj08' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright &copy; 2026 <a href="https://sitharaj.in">Sitharaj Seenivasan</a>'
    },

    editLink: {
      pattern: 'https://github.com/sitharaj88/nectoproxy/edit/main/docs-site/:path',
      text: 'Edit this page on GitHub'
    },

    lastUpdated: {
      text: 'Last updated'
    },

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3]
    }
  }
})
