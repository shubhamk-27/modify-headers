var started = 'off';
const debug_mode = false;

window.onload = function () {
    document.getElementById('config').addEventListener('click', function (e) {
        start_config();
    });
    document.getElementById('start_stop').addEventListener('click', function (e) {
        start_modify();
    });
    loadFromBrowserStorage(['started'], function (result) {
        started = result.started;
        if (started === 'on') document.getElementById('start_stop').value = 'Stop';
    });
};

function loadFromBrowserStorage(item, callback_function) {
    chrome.storage.local.get(item, callback_function);
}

function storeInBrowserStorage(item, callback_function) {
    chrome.storage.local.set(item, callback_function);
}

function start_modify() {
    if (started === 'off') {
        storeInBrowserStorage({started: 'on'}, function () {
            started = 'on';
            if (useManifestV3) {
                applyConfigWithManifestV3();
            } else {
                chrome.runtime.sendMessage('on');
            }
            document.getElementById('start_stop').value = 'Stop';
            chrome.tabs.query({currentWindow: true}, reloadConfigTab);
        });
    } else {
        storeInBrowserStorage({started: 'off'}, function () {
            if (useManifestV3) {
                removeConfigWithManifestV3(() => {});
            } else {
                chrome.runtime.sendMessage('off');
            }
            started = 'off';
            document.getElementById('start_stop').value = 'Start';
            chrome.tabs.query({currentWindow: true}, reloadConfigTab);
        });
    }
}

function reloadConfigTab(tabs) {
    var config_tab;
    for (let tab of tabs) {
        if (tab.url.startsWith(chrome.runtime.getURL(''))) config_tab = tab;
    }
    if (config_tab) chrome.tabs.reload(config_tab.id);
}

function start_config() {
    chrome.tabs.query({currentWindow: true}, loadConfigTab);
}

function loadConfigTab(tabs) {
    var config_tab;
    for (let tab of tabs) {
        if (tab.url.startsWith(chrome.runtime.getURL(''))) config_tab = tab;
    }
    if (config_tab) chrome.tabs.update(config_tab.id, {active: true});
    else chrome.tabs.create({url: '/popup/config.html'});
}
