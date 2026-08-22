const ENDPOINT = 'https://idic-user-d6gtc5ykqd62f29dc.service.tcloudbase.com/mmianji-import-license';

function makePanel() {
    const panel = document.createElement('div');
    panel.id = 'mmianji-import-license-panel';
    panel.className = 'inline-drawer';
    panel.innerHTML = `
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>眠眠机导入许可</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <p>仅提交眠眠机显示的六位验证码，不读取或上传你的酒馆内容。</p>
            <div class="mmianji-license-row">
                <input id="mmianji-license-code" class="text_pole" inputmode="numeric" maxlength="6" placeholder="六位验证码">
                <button id="mmianji-license-submit" class="menu_button">确认验证</button>
            </div>
            <small id="mmianji-license-result" aria-live="polite"></small>
        </div>`;
    return panel;
}

function showResult(message, isError) {
    const element = document.getElementById('mmianji-license-result');
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('mmianji-license-error', Boolean(isError));
}

async function submitCode() {
    const input = document.getElementById('mmianji-license-code');
    const button = document.getElementById('mmianji-license-submit');
    const code = String(input && input.value || '').replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(code)) {
        showResult('请输入完整的六位验证码。', true);
        return;
    }
    button.disabled = true;
    showResult('正在确认……', false);
    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({ action: 'confirmChallenge', code, client: 'sillytavern-extension-v1' })
        });
        const result = await response.json();
        if (!result || !result.ok) throw new Error(result && result.error && result.error.message || '验证失败');
        input.value = '';
        showResult(`验证成功，许可已绑定眠眠机账号 ${result.data.account}。`, false);
    } catch (error) {
        showResult(error.message || '无法连接验证服务。', true);
    } finally {
        button.disabled = false;
    }
}

function installPanel() {
    if (document.getElementById('mmianji-import-license-panel')) return;
    const host = document.getElementById('extensions_settings');
    if (!host) return setTimeout(installPanel, 500);
    const panel = makePanel();
    host.appendChild(panel);
    panel.querySelector('.inline-drawer-toggle').addEventListener('click', function () {
        panel.querySelector('.inline-drawer-content').classList.toggle('openDrawer');
        panel.querySelector('.inline-drawer-icon').classList.toggle('down');
        panel.querySelector('.inline-drawer-icon').classList.toggle('up');
    });
    panel.querySelector('#mmianji-license-submit').addEventListener('click', submitCode);
    panel.querySelector('#mmianji-license-code').addEventListener('keydown', function (event) {
        if (event.key === 'Enter') submitCode();
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installPanel);
else installPanel();
