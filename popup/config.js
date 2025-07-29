let line_number;
let started;
let show_comments;
let use_url_contains;
let input_field_style;
let check_all;
let import_flag = true;
let debug_mode = false;

window.onload = function () {
    initConfigurationPage();
};

function initConfigurationPage() {
    initGlobalValue();
    loadFromBrowserStorage(['config'], function (result) {
        let config;
        if (result.config === undefined) {
            config = getDefaultConfig();
        } else {
            config = JSON.parse(result.config);
            if (useManifestV3) config = removeCookiesActionFromConfig(config);
        }

        debug_mode = config.debug_mode || false;
        document.getElementById('debug_mode').checked = debug_mode;

        show_comments = typeof config.show_comments === 'undefined' ? true : config.show_comments;
        document.getElementById('show_comments').checked = show_comments;

        use_url_contains = config.use_url_contains || false;
        document.getElementById('use_url_contains').checked = use_url_contains;

        config.headers.forEach((h) =>
            appendLine(h.url_contains, h.action, h.header_name, h.header_value, h.comment, h.apply_on, h.status)
        );

        document.getElementById('save_button').addEventListener('click', saveData);
        document.getElementById('export_button').addEventListener('click', exportData);
        document.getElementById('import_button').addEventListener('click', importData);
        document.getElementById('append_button').addEventListener('click', appendData);
        document.getElementById('parameters_button').addEventListener('click', showParametersScreen);
        document
            .getElementById('add_button')
            .addEventListener('click', () => appendLine('', 'add', '-', '-', '', 'req', 'on'));

        document.getElementById('start_img').addEventListener('click', startModify);
        document.getElementById('targetPage').value = config.target_page || '';
        checkTargetPageField();
        document.getElementById('targetPage').addEventListener('keyup', checkTargetPageField);
        document.getElementById('exit_parameters_screen_button').addEventListener('click', hideParametersScreen);
        document.querySelector('#export_row_header').addEventListener('click', switchAllExportButtons);

        loadFromBrowserStorage(['started'], function (res) {
            started = res.started || 'off';
            document.getElementById('start_img').src = started === 'on' ? 'img/stop.png' : 'img/start.png';
        });

        document.getElementById('show_comments').addEventListener('click', () => {
            show_comments = document.getElementById('show_comments').checked;
            reshapeTable();
        });

        document.getElementById('use_url_contains').addEventListener('click', () => {
            use_url_contains = document.getElementById('use_url_contains').checked;
            reshapeTable();
        });

        document.getElementById('debug_mode').addEventListener('click', () => {
            debug_mode = document.getElementById('debug_mode').checked;
        });

        reshapeTable();
    });
}

function getDefaultConfig() {
    return {
        format_version: '1.2',
        target_page: 'https://httpbin.org/*',
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
        ],
        debug_mode: false,
        use_url_contains: false,
        show_comments: true
    };
}

function initGlobalValue() {
    line_number = 1;
    started = 'off';
    show_comments = true;
    use_url_contains = false;
    input_field_style = 'form_control input_field_small';
    check_all = true;
    import_flag = true;
}

function loadFromBrowserStorage(items, callback) {
    chrome.storage.local.get(items, callback);
}

function storeInBrowserStorage(items, callback) {
    chrome.storage.local.set(items, callback);
}

function showParametersScreen() {
    document.getElementById('main_screen').hidden = true;
    document.getElementById('parameters_screen').hidden = false;
}

function hideParametersScreen() {
    document.getElementById('main_screen').hidden = false;
    document.getElementById('parameters_screen').hidden = true;
}

function appendLine(url_contains, action, header_name, header_value, comment, apply_on, status) {
    const hideUrlContains = use_url_contains ? '' : 'hidden';
    let html =
        `
        <td ${hideUrlContains}>
            <input class="${input_field_style}" id="url_contains${line_number}" />
        </td>
        <td>
            <select class="form_control select_field" id="select_action${line_number}">
                <option value="add">Add</option>
                <option value="modify">Modify</option>
                <option value="delete">Delete</option>` +
        (!useManifestV3
            ? `
                <option value="cookie_add_or_modify">Cookie Add/Modify</option>
                <option value="cookie_delete">Cookie Delete</option>`
            : '') +
        `
            </select>
        </td>
        <td><input class="${input_field_style}" id="header_name${line_number}" /></td>
        <td><input class="${input_field_style}" id="header_value${line_number}" /></td>
        <td ${show_comments ? '' : 'hidden'}>
            <input class="${input_field_style}" id="comment${line_number}" />
        </td>
        <td>
            <select class="form_control select_field" id="apply_on${line_number}">
                <option value="req">Request</option>
                <option value="res">Response</option>
            </select>
        </td>
        <td>
            <button type="button" class="btn btn-primary btn-sm" title="Activate/deactivate rule" id="activate_button${line_number}">ON <span class="glyphicon glyphicon-ok"></span></button>
        </td>
        <td>
            <button type="button" class="btn btn-primary btn-sm" title="Select rule for export" id="check_button${line_number}">
                To export <span class="glyphicon glyphicon-ok"></span>
            </button>
        </td>
        <td>
            <button type="button" class="btn btn-default btn-sm" title="Move line up" id="up_button${line_number}">
                <span class="glyphicon glyphicon-arrow-up"></span>
            </button>
        </td>
        <td>
            <button type="button" class="btn btn-default btn-sm" title="Move line down" id="down_button${line_number}">
                <span class="glyphicon glyphicon-arrow-down"></span>
            </button>
        </td>
        <td>
            <button type="button" class="btn btn-default btn-sm" title="Delete line" id="delete_button${line_number}">
                <span class="glyphicon glyphicon-trash"></span>
            </button>
        </td>`;

    const newTR = document.createElement('tr');
    newTR.id = 'line' + line_number;
    newTR.innerHTML = html;
    document.getElementById('config_tab').appendChild(newTR);

    document.getElementById('select_action' + line_number).value = action;
    document.getElementById('apply_on' + line_number).value = apply_on;
    document.getElementById('url_contains' + line_number).value = url_contains;
    document.getElementById('header_name' + line_number).value = header_name;
    document.getElementById('header_value' + line_number).value = header_value;
    document.getElementById('comment' + line_number).value = comment;

    const num = line_number;
    document.getElementById('activate_button' + line_number).addEventListener('click', () => switchActivateButton(num));
    setButtonStatus(document.getElementById('activate_button' + line_number), status);
    document.getElementById('delete_button' + line_number).addEventListener('click', () => deleteLine(num));
    document.getElementById('up_button' + line_number).addEventListener('click', () => invertLine(num, num - 1));
    document.getElementById('down_button' + line_number).addEventListener('click', () => invertLine(num, num + 1));
    document.getElementById('check_button' + line_number).addEventListener('click', () => switchExportButton(num));
    line_number++;
}

function setButtonStatus(button, status) {
    if (status === 'on') {
        button.className = 'btn btn-primary btn-sm';
        button.innerHTML = 'ON <span class="glyphicon glyphicon-ok"></span>';
    } else {
        button.className = 'btn btn-default btn-sm';
        button.innerHTML = 'OFF <span class="glyphicon glyphicon-ban-circle"></span>';
    }
}

function setExportButtonStatus(button, status) {
    if (status === 'on') {
        button.className = 'btn btn-primary btn-sm';
        button.innerHTML = 'To export <span class="glyphicon glyphicon-ok"></span>';
    } else {
        button.className = 'btn btn-default btn-sm';
        button.innerHTML = 'No export <span class="glyphicon glyphicon-ban-circle"></span>';
    }
}

function getButtonStatus(button) {
    return button.className === 'btn btn-primary btn-sm' ? 'on' : 'off';
}

function switchActivateButton(button_number) {
    const button = document.getElementById('activate_button' + button_number);
    setButtonStatus(button, getButtonStatus(button) === 'on' ? 'off' : 'on');
}

function switchExportButton(button_number) {
    const button = document.getElementById('check_button' + button_number);
    setExportButtonStatus(button, getButtonStatus(button) === 'on' ? 'off' : 'on');
}

function reshapeTable() {
    const th_elements = document.querySelectorAll('#config_table_head th');
    const tr_elements = document.querySelectorAll('#config_tab tr');

    input_field_style = show_comments
        ? use_url_contains
            ? 'form_control input_field_small'
            : 'form_control input_field_medium'
        : use_url_contains
        ? 'form_control input_field_medium'
        : 'form_control input_field_large';

    for (const tr of tr_elements) {
        tr.children[4].children[0].className = input_field_style;
        tr.children[4].hidden = !show_comments;
        tr.children[3].children[0].className = input_field_style;
        tr.children[2].children[0].className = input_field_style;
        tr.children[0].children[0].className = input_field_style;
        tr.children[0].hidden = !use_url_contains;
    }
    th_elements[4].hidden = !show_comments;
    th_elements[0].hidden = !use_url_contains;
}

function create_configuration_data(saveOrExport) {
    const tr_elements = document.querySelectorAll('#config_tab tr');
    let headers = [];
    let debug_mode = document.getElementById('debug_mode').checked;
    let show_comments = document.getElementById('show_comments').checked;
    let use_url_contains = document.getElementById('use_url_contains').checked;

    for (const tr of tr_elements) {
        const exportStatus = getButtonStatus(tr.children[7].children[0]);
        if (saveOrExport === 'save' || exportStatus === 'on') {
            headers.push({
                url_contains: tr.children[0].children[0].value,
                action: tr.children[1].children[0].value,
                header_name: tr.children[2].children[0].value,
                header_value: tr.children[3].children[0].value,
                comment: tr.children[4].children[0].value,
                apply_on: tr.children[5].children[0].value,
                status: getButtonStatus(tr.children[6].children[0])
            });
        }
    }

    return JSON.stringify({
        format_version: '1.2',
        target_page: document.getElementById('targetPage').value,
        headers: headers,
        debug_mode: debug_mode,
        show_comments: show_comments,
        use_url_contains: use_url_contains
    });
}

function checkTargetPageField() {
    const field = document.getElementById('targetPage');
    field.style.color = isTargetValid(field.value) ? 'black' : 'red';
}

function isTargetValid(target) {
    if (!target || target.trim() === '' || target === '*') return true;
    const patterns = target.split(';');
    return patterns.every((p) => p.match(/^(http|https|[*]):\/\/([*]\.[^*]*|[^*]*|[*])\//));
}

function switchAllExportButtons() {
    check_all = !check_all;
    const buttons = document.querySelectorAll("#config_tab tr td > [title='Select rule for export']");
    buttons.forEach((btn) => setExportButtonStatus(btn, check_all ? 'on' : 'off'));
}

function saveData() {
    if (!isTargetValid(document.getElementById('targetPage').value)) {
        alert('Warning: Url patterns are invalid');
        return false;
    }

    storeInBrowserStorage({config: create_configuration_data('save')}, () => {
        if (useManifestV3) applyConfigWithManifestV3();
        else chrome.runtime.sendMessage('reload');
    });
    return true;
}

function exportData() {
    const to_export = create_configuration_data('export');
    const a = document.createElement('a');
    a.href = 'data:attachment/json,' + encodeURIComponent(to_export);
    a.target = 'download';
    a.download = 'ModifyHeader.conf';

    const myf = document.getElementById('download');
    const doc = myf.contentWindow.document || myf.contentDocument;
    doc.body.appendChild(a);
    a.click();
}

function appendData(evt) {
    if (window.confirm('This will append data to your actual configuration, do you want to continue?')) {
        import_flag = false;
        openFile();
    }
}

function importData(evt) {
    if (window.confirm('This will erase your actual configuration, do you want to continue?')) {
        import_flag = true;
        openFile();
    }
}

function openFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.conf';
    input.addEventListener('change', readSingleFile, false);
    const myf = document.getElementById('download');
    const doc = myf.contentWindow.document || myf.contentDocument;
    doc.body.appendChild(input);
    input.click();
}

function readSingleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => loadConfiguration(e.target.result);
    reader.readAsText(file);
}

function loadConfiguration(confStr) {
    let config;
    try {
        config = JSON.parse(confStr);
        if (config.format_version) {
            if (config.format_version === '1.0') config = convertConfigurationFormat1dot0ToCurrentFormat(config);
            else if (config.format_version === '1.1') config = convertConfigurationFormat1dot1ToCurrentFormat(config);
        } else if (Array.isArray(config) && config[0] && config[0].action) {
            config = convertHistoricalModifyHeaderFormatToCurrentFormat(config);
        } else {
            alert('Invalid file format');
            return;
        }

        if (useManifestV3) config = removeCookiesActionFromConfig(config);
    } catch (ex) {
        alert('Invalid file format');
        return;
    }

    if (!import_flag) {
        loadFromBrowserStorage(['config'], (result) => {
            const appConfig = JSON.parse(result.config);
            config.headers.forEach((rule) => appConfig.headers.push(rule));
            storeInBrowserStorage({config: JSON.stringify(appConfig)}, reloadConfigPage);
        });
    } else {
        storeInBrowserStorage({config: JSON.stringify(config)}, reloadConfigPage);
    }
}

function convertConfigurationFormat1dot0ToCurrentFormat(config) {
    config.format_version = '1.2';
    config.headers.forEach((line) => {
        line.apply_on = 'req';
        line.url_contains = '';
    });
    config.debug_mode = false;
    config.show_comments = true;
    config.use_url_contains = false;
    return config;
}

function convertConfigurationFormat1dot1ToCurrentFormat(config) {
    config.format_version = '1.2';
    config.headers.forEach((line) => (line.url_contains = ''));
    config.show_comments = true;
    config.use_url_contains = false;
    return config;
}

function convertHistoricalModifyHeaderFormatToCurrentFormat(config) {
    const headers = config.map((line) => ({
        url_contains: '',
        action: line.action === 'Filter' ? 'delete' : line.action.toLowerCase(),
        header_name: line.name,
        header_value: line.value,
        comment: line.comment,
        apply_on: 'req',
        status: line.enabled ? 'on' : 'off'
    }));

    return {
        format_version: '1.2',
        target_page: '',
        headers,
        debug_mode: false,
        show_comments: true,
        use_url_contains: false
    };
}

function removeCookiesActionFromConfig(config) {
    config.headers = config.headers.filter(
        (line) => line.action !== 'cookie_add_or_modify' && line.action !== 'cookie_delete'
    );
    return config;
}

function reloadConfigPage() {
    if (useManifestV3) applyConfigWithManifestV3();
    else chrome.runtime.sendMessage('reload');
    document.location.href = 'config.html';
}

function deleteLine(num) {
    if (num !== line_number) {
        for (let i = num; i < line_number - 1; i++) {
            const j = i + 1;
            ['select_action', 'url_contains', 'header_name', 'header_value', 'comment', 'apply_on'].forEach(
                (idPrefix) => {
                    document.getElementById(idPrefix + i).value = document.getElementById(idPrefix + j).value;
                }
            );
            setButtonStatus(
                document.getElementById('activate_button' + i),
                getButtonStatus(document.getElementById('activate_button' + j))
            );
            setExportButtonStatus(
                document.getElementById('check_button' + i),
                getButtonStatus(document.getElementById('check_button' + j))
            );
        }
    }
    const node = document.getElementById('line' + (line_number - 1));
    node.parentNode.removeChild(node);
    line_number--;
}

function invertLine(line1, line2) {
    if ([line1, line2].some((n) => n === 0 || n >= line_number)) return;

    const attrs = ['select_action', 'url_contains', 'header_name', 'header_value', 'comment', 'apply_on'];
    const saveLine1 = {};
    attrs.forEach((a) => (saveLine1[a] = document.getElementById(a + line1).value));
    saveLine1.activate_status = getButtonStatus(document.getElementById('activate_button' + line1));
    saveLine1.export_status = getButtonStatus(document.getElementById('check_button' + line1));

    attrs.forEach((a) => {
        document.getElementById(a + line1).value = document.getElementById(a + line2).value;
    });
    setButtonStatus(
        document.getElementById('activate_button' + line1),
        getButtonStatus(document.getElementById('activate_button' + line2))
    );
    document.getElementById('apply_on' + line1).value = document.getElementById('apply_on' + line2).value;
    setExportButtonStatus(
        document.getElementById('check_button' + line1),
        getButtonStatus(document.getElementById('check_button' + line2))
    );

    attrs.forEach((a) => {
        document.getElementById(a + line2).value = saveLine1[a];
    });
    setButtonStatus(document.getElementById('activate_button' + line2), saveLine1.activate_status);
    document.getElementById('apply_on' + line2).value = saveLine1.apply_on;
    setExportButtonStatus(document.getElementById('check_button' + line2), saveLine1.export_status);
}

function startModify() {
    if (started === 'off') {
        saveData();
        storeInBrowserStorage({started: 'on'}, function () {
            started = 'on';
            document.getElementById('start_img').src = 'img/stop.png';
            if (useManifestV3) applyConfigWithManifestV3();
            else chrome.runtime.sendMessage('on');
        });
    } else {
        storeInBrowserStorage({started: 'off'}, function () {
            started = 'off';
            document.getElementById('start_img').src = 'img/start.png';
            if (useManifestV3) removeConfigWithManifestV3();
            else chrome.runtime.sendMessage('off');
        });
    }
}
