//! Script API Shim
//!
//! Provides the LX Music compatible API for user scripts.

/// LX Music API shim JavaScript code
pub const LX_API_SHIM: &str = r#"
// LX Music API Shim for Jiyu Music
(function() {
    'use strict';
    
    // Event system
    const eventHandlers = {};
    
    const EVENT_NAMES = {
        request: 'request',
        inited: 'inited',
        musicUrl: 'musicUrl',
        lyric: 'lyric',
        pic: 'pic',
        search: 'search',
    };
    
    // HTTP request using fetch
    async function request(url, options = {}, callback) {
        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers: options.headers || {},
                body: options.body,
            });
            
            let body;
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                body = await response.json();
            } else {
                body = await response.text();
            }
            
            if (callback) {
                callback(null, { statusCode: response.status, body });
            }
            return { statusCode: response.status, body };
        } catch (error) {
            if (callback) {
                callback(error, null);
            }
            throw error;
        }
    }
    
    // Event handling
    function on(eventName, handler) {
        if (!eventHandlers[eventName]) {
            eventHandlers[eventName] = [];
        }
        eventHandlers[eventName].push(handler);
    }
    
    function send(eventName, data) {
        const handlers = eventHandlers[eventName] || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (e) {
                console.error('Event handler error:', e);
            }
        });
    }
    
    // Buffer utilities
    const buffer = {
        from: function(data, encoding) {
            if (typeof data === 'string') {
                return new TextEncoder(encoding || 'utf-8').encode(data);
            }
            return new Uint8Array(data);
        },
        bufToString: function(buf, encoding) {
            if (encoding === 'base64') {
                return btoa(String.fromCharCode.apply(null, buf));
            }
            return new TextDecoder(encoding || 'utf-8').decode(buf);
        },
    };
    
    // Version info
    const version = '1.0.0';
    const env = 'jiyu-music';
    
    // Expose globalThis.lx
    globalThis.lx = {
        EVENT_NAMES,
        request,
        on,
        send,
        utils: { buffer },
        env,
        version,
    };
    
    console.log('LX Music API Shim initialized');
})();
"#;
