'use strict';

let config;
let started = 'off';

loadFromBrowserStorage(['config', 'started'], function (result) {
    if (result.config === undefined) {
        config = getDefaultConfig();
        storeInBrowserStorage({config: JSON.stringify(config)});
    } else {
        config = JSON.parse(result.config);
    }

    started = result.started || 'off';

    if (started === 'on') {
        addListener();
        chrome.browserAction.setIcon({path: 'icons/modify-green-32.png'});
    } else {
        started = 'off';
        storeInBrowserStorage({started: 'off'});
    }

    chrome.runtime.onMessage.addListener(notify);
});

function getDefaultConfig() {
    return {
        format_version: '1.2',
        target_page: 'https://httpbin.org/*',
        debug_mode: false,
        use_url_contains: false,
        headers: [
            {
                url_contains: '',
                action: 'add',
                header_name: 'test-header-name',
                header_value: 'test-header-value',
                comment: 'test',
                apply_on: 'req',
                status: 'on'
            }
        ]
    };
}

function loadFromBrowserStorage(items, callback) {
    chrome.storage.local.get(items, callback);
}

function storeInBrowserStorage(items, callback) {
    chrome.storage.local.set(items, callback);
}

function cookie_keyvalues_set(original_cookies, key, value) {
    let new_element = ' ' + key + '=' + value;
    let cookies_ar = original_cookies.split(';').filter((e) => e.trim().length > 0);
    let idx = cookies_ar.findIndex((kv) => kv.trim().startsWith(key + '='));
    if (idx === -1 && value !== undefined) {
        cookies_ar.push(new_element);
    } else {
        if (value === undefined) cookies_ar.splice(idx, 1);
        else cookies_ar.splice(idx, 1, new_element);
    }
    return cookies_ar.join(';');
}

function set_cookie_modify_cookie_value(original_set_cookie_content, key, new_value) {
    let trimmed = original_set_cookie_content.trimStart();
    let attrs = trimmed.indexOf(';') === -1 ? '' : trimmed.substring(trimmed.indexOf(';'));
    return key + '=' + new_value + attrs;
}

function log(message) {
    if (config && config.debug_mode) {
        console.log(new Date() + ' ModifyHeader : ' + message);
    }
}

function doesUrlContainsAnUrlContains(url, url_contains) {
    if (!url_contains) return true;
    url_contains = url_contains.trim();
    if (url_contains.includes(';')) {
        let arr = url_contains.split(';');
        return arr.some((part) => part.length > 0 && url.includes(part));
    }
    return url.includes(url_contains);
}

function rewriteRequestHeader(e) {
    if (config.debug_mode) log('Start modify request headers for url ' + e.url);
    for (let to_modify of config.headers) {
        if (
            to_modify.status === 'on' &&
            to_modify.apply_on === 'req' &&
            (!config.use_url_contains || doesUrlContainsAnUrlContains(e.url, to_modify.url_contains))
        ) {
            if (to_modify.action === 'add') {
                e.requestHeaders.push({name: to_modify.header_name, value: to_modify.header_value});
                if (config.debug_mode)
                    log(
                        'Add request header: ' +
                            to_modify.header_name +
                            ' = ' +
                            to_modify.header_value +
                            ' for ' +
                            e.url
                    );
            } else if (to_modify.action === 'modify') {
                for (let header of e.requestHeaders) {
                    if (header.name.toLowerCase() === to_modify.header_name.toLowerCase()) {
                        if (config.debug_mode)
                            log(
                                'Modify request header: ' +
                                    to_modify.header_name +
                                    ' from ' +
                                    header.value +
                                    ' to ' +
                                    to_modify.header_value +
                                    ' for ' +
                                    e.url
                            );
                        header.value = to_modify.header_value;
                    }
                }
            } else if (to_modify.action === 'delete') {
                let idx = e.requestHeaders.findIndex(
                    (h) => h.name.toLowerCase() === to_modify.header_name.toLowerCase()
                );
                if (idx !== -1) {
                    e.requestHeaders.splice(idx, 1);
                    if (config.debug_mode) log('Delete request header: ' + to_modify.header_name + ' for ' + e.url);
                }
            } else if (to_modify.action === 'cookie_add_or_modify') {
                let cookieHeader = e.requestHeaders.find((h) => h.name.toLowerCase() === 'cookie');
                let newCookie = cookie_keyvalues_set(
                    cookieHeader ? cookieHeader.value : '',
                    to_modify.header_name,
                    to_modify.header_value
                );
                if (!cookieHeader) {
                    e.requestHeaders.push({name: 'Cookie', value: newCookie});
                    if (config.debug_mode) log('Add new Cookie header with ' + newCookie + ' for ' + e.url);
                } else {
                    cookieHeader.value = newCookie;
                    if (config.debug_mode) log('Modify Cookie header to ' + newCookie + ' for ' + e.url);
                }
            } else if (to_modify.action === 'cookie_delete') {
                let cookieHeader = e.requestHeaders.find((h) => h.name.toLowerCase() === 'cookie');
                if (cookieHeader) {
                    let newCookie = cookie_keyvalues_set(cookieHeader.value, to_modify.header_name, undefined);
                    cookieHeader.value = newCookie;
                    if (config.debug_mode)
                        log('Delete cookie ' + to_modify.header_name + ' from Cookie header for ' + e.url);
                } else {
                    if (config.debug_mode) log('No Cookie header to delete for ' + e.url);
                }
            }
        }
    }
    if (config.debug_mode) log('End modify request headers for url ' + e.url);
    return {requestHeaders: e.requestHeaders};
}

function rewriteResponseHeader(e) {
    if (config.debug_mode) log('Start modify response headers for url ' + e.url);
    for (let to_modify of config.headers) {
        if (
            to_modify.status === 'on' &&
            to_modify.apply_on === 'res' &&
            (!config.use_url_contains || doesUrlContainsAnUrlContains(e.url, to_modify.url_contains))
        ) {
            if (to_modify.action === 'add') {
                e.responseHeaders.push({name: to_modify.header_name, value: to_modify.header_value});
                if (config.debug_mode)
                    log(
                        'Add response header: ' +
                            to_modify.header_name +
                            ' = ' +
                            to_modify.header_value +
                            ' for ' +
                            e.url
                    );
            } else if (to_modify.action === 'modify') {
                for (let header of e.responseHeaders) {
                    if (header.name.toLowerCase() === to_modify.header_name.toLowerCase()) {
                        if (config.debug_mode)
                            log(
                                'Modify response header: ' +
                                    to_modify.header_name +
                                    ' from ' +
                                    header.value +
                                    ' to ' +
                                    to_modify.header_value +
                                    ' for ' +
                                    e.url
                            );
                        header.value = to_modify.header_value;
                    }
                }
            } else if (to_modify.action === 'delete') {
                let idx = e.responseHeaders.findIndex(
                    (h) => h.name.toLowerCase() === to_modify.header_name.toLowerCase()
                );
                if (idx !== -1) {
                    e.responseHeaders.splice(idx, 1);
                    if (config.debug_mode) log('Delete response header: ' + to_modify.header_name + ' for ' + e.url);
                }
            } else if (to_modify.action === 'cookie_add_or_modify') {
                let header_cookie = e.responseHeaders.find(
                    (h) =>
                        h.name.toLowerCase() === 'set-cookie' &&
                        h.value
                            .toLowerCase()
                            .trim()
                            .startsWith(to_modify.header_name.toLowerCase() + '=')
                );
                let newVal = set_cookie_modify_cookie_value(
                    header_cookie ? header_cookie.value : '',
                    to_modify.header_name,
                    to_modify.header_value
                );
                if (!header_cookie) {
                    e.responseHeaders.push({name: 'Set-Cookie', value: newVal});
                    if (config.debug_mode) log('Add new Set-Cookie header: ' + newVal + ' for ' + e.url);
                } else {
                    header_cookie.value = newVal;
                    if (config.debug_mode) log('Modify Set-Cookie header to ' + newVal + ' for ' + e.url);
                }
            } else if (to_modify.action === 'cookie_delete') {
                let idx = e.responseHeaders.findIndex(
                    (h) =>
                        h.name.toLowerCase() === 'set-cookie' &&
                        h.value
                            .toLowerCase()
                            .trim()
                            .startsWith(to_modify.header_name.toLowerCase() + '=')
                );
                if (idx !== -1) {
                    e.responseHeaders.splice(idx, 1);
                    if (config.debug_mode) log('Delete Set-Cookie header: ' + to_modify.header_name + ' for ' + e.url);
                }
            }
        }
    }
    if (config.debug_mode) log('End modify response headers for url ' + e.url);
    return {responseHeaders: e.responseHeaders};
}

function notify(message) {
    if (message === 'reload') {
        loadFromBrowserStorage(['config'], function (result) {
            config = JSON.parse(result.config);
            if (started === 'on') {
                removeListener();
                addListener();
            }
        });
    } else if (message === 'off') {
        removeListener();
        chrome.browserAction.setIcon({path: 'icons/modify-32.png'});
        started = 'off';
        if (config.debug_mode) log('Stop modifying headers');
    } else if (message === 'on') {
        addListener();
        chrome.browserAction.setIcon({path: 'icons/modify-green-32.png'});
        started = 'on';
        if (config.debug_mode) log('Start modifying headers');
    }
}

function addListener() {
    let target = config.target_page.replaceAll(' ', '');
    if (target === '*' || target === '') target = '<all_urls>';
    chrome.webRequest.onBeforeSendHeaders.addListener(rewriteRequestHeader, {urls: target.split(';')}, [
        'blocking',
        'requestHeaders'
    ]);
    chrome.webRequest.onHeadersReceived.addListener(rewriteResponseHeader, {urls: target.split(';')}, [
        'blocking',
        'responseHeaders'
    ]);
}

function removeListener() {
    chrome.webRequest.onBeforeSendHeaders.removeListener(rewriteRequestHeader);
    chrome.webRequest.onHeadersReceived.removeListener(rewriteResponseHeader);
}
