const LICENSE_ENDPOINT = 'https://idic-user-d6gtc5ykqd62f29dc.service.tcloudbase.com/mmianji-import-license';
const REVIEW_ENDPOINT = 'https://idic-user-d6gtc5ykqd62f29dc.service.tcloudbase.com/mmianji-review';
const CLIENT_ID = 'sillytavern-extension-v1';

const reviewState = { token: '', stage: 'idle' };

function element(id) {
    return document.getElementById(id);
}

function makePanel() {
    const panel = document.createElement('div');
    panel.id = 'mmianji-import-license-panel';
    panel.className = 'inline-drawer';
    panel.innerHTML = `
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>?????</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <section class="mmianji-verify-section" aria-labelledby="mmianji-license-title">
                <h3 id="mmianji-license-title">??????</h3>
                <p>????????????????????????????</p>
                <div class="mmianji-license-row">
                    <input id="mmianji-license-code" class="text_pole" inputmode="numeric" maxlength="6" aria-label="?????" placeholder="?????">
                    <button id="mmianji-license-submit" class="menu_button">????</button>
                </div>
                <small id="mmianji-license-result" aria-live="polite"></small>
            </section>
            <section class="mmianji-verify-section" aria-labelledby="mmianji-review-title">
                <h3 id="mmianji-review-title">??????</h3>
                <p>??????????????????????????????????</p>
                <button id="mmianji-review-start" class="menu_button">????</button>
                <div id="mmianji-review-flow" hidden>
                    <small id="mmianji-review-progress"></small>
                    <section id="mmianji-review-pledge" hidden>
                        <p>??????????</p>
                        <p id="mmianji-review-pledge-text" class="mmianji-review-copy"></p>
                        <textarea id="mmianji-review-pledge-input" class="text_pole" rows="5" aria-label="????"></textarea>
                        <button id="mmianji-review-pledge-submit" class="menu_button">????</button>
                    </section>
                    <section id="mmianji-review-question" hidden>
                        <p id="mmianji-review-question-text" class="mmianji-review-copy"></p>
                        <div id="mmianji-review-choices" role="group" aria-label="????"></div>
                    </section>
                </div>
                <small id="mmianji-review-result" aria-live="polite"></small>
                <button id="mmianji-review-restart" class="menu_button" hidden>????</button>
            </section>
        </div>`;
    return panel;
}

function showResult(id, message, isError) {
    const target = element(id);
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('mmianji-license-error', Boolean(isError));
}

async function postJson(endpoint, payload) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!result || typeof result !== 'object') throw new Error('????????');
    if (!result.ok) {
        const error = new Error(result.error && result.error.message || '????');
        error.code = result.error && result.error.code || 'UNKNOWN_ERROR';
        throw error;
    }
    if (!result.data || typeof result.data !== 'object') throw new Error('????????');
    return result.data;
}

async function submitCode() {
    const input = element('mmianji-license-code');
    const button = element('mmianji-license-submit');
    const code = String(input && input.value || '').replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(code)) return showResult('mmianji-license-result', '????????????', true);
    button.disabled = true;
    showResult('mmianji-license-result', '??????', false);
    try {
        const data = await postJson(LICENSE_ENDPOINT, { action: 'confirmChallenge', code, client: CLIENT_ID });
        input.value = '';
        showResult('mmianji-license-result', `??????????????? ${data.account}?`, false);
    } catch (error) {
        showResult('mmianji-license-result', error.message || '?????????', true);
    } finally {
        button.disabled = false;
    }
}

async function requestReview(action, value) {
    const payload = { action, client: CLIENT_ID };
    if (reviewState.token) payload.token = reviewState.token;
    if (typeof value === 'string') payload.value = value;
    return postJson(REVIEW_ENDPOINT, payload);
}

function setReviewBusy(busy) {
    ['mmianji-review-start', 'mmianji-review-pledge-submit', 'mmianji-review-restart'].forEach(id => {
        const button = element(id);
        if (button) button.disabled = busy;
    });
    const choices = element('mmianji-review-choices');
    if (choices) choices.querySelectorAll('button').forEach(button => { button.disabled = busy; });
}

function resetReview(message) {
    reviewState.token = '';
    reviewState.stage = 'idle';
    element('mmianji-review-flow').hidden = true;
    element('mmianji-review-pledge').hidden = true;
    element('mmianji-review-question').hidden = true;
    element('mmianji-review-start').hidden = false;
    element('mmianji-review-restart').hidden = true;
    if (message) showResult('mmianji-review-result', message, true);
}

function renderReview(data) {
    reviewState.token = typeof data.token === 'string' ? data.token : '';
    reviewState.stage = data.stage;
    element('mmianji-review-flow').hidden = false;
    element('mmianji-review-start').hidden = true;
    element('mmianji-review-restart').hidden = true;
    element('mmianji-review-pledge').hidden = data.stage !== 'pledge';
    element('mmianji-review-question').hidden = data.stage !== 'question';
    showResult('mmianji-review-result', '', false);

    if (data.stage === 'pledge' && typeof data.pledge === 'string') {
        element('mmianji-review-progress').textContent = '?? 1/2 ? ????';
        element('mmianji-review-pledge-text').textContent = data.pledge;
        element('mmianji-review-pledge-input').value = '';
        element('mmianji-review-pledge-input').focus();
        return;
    }
    if (data.stage === 'question' && data.question && Array.isArray(data.question.choices)) {
        const question = data.question;
        element('mmianji-review-progress').textContent = `?? 2/2 ? ? ${question.number}/${question.total} ?`;
        element('mmianji-review-question-text').textContent = question.prompt || '';
        const choices = element('mmianji-review-choices');
        choices.replaceChildren();
        question.choices.forEach(choice => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'menu_button mmianji-review-choice';
            button.textContent = `${choice.value} ? ${choice.label}`;
            button.addEventListener('click', function () { submitReviewAnswer(choice.value); });
            choices.appendChild(button);
        });
        const firstChoice = choices.querySelector('button');
        if (firstChoice) firstChoice.focus();
        return;
    }
    if (data.stage === 'complete' && typeof data.group === 'string') {
        element('mmianji-review-progress').textContent = '????';
        element('mmianji-review-pledge').hidden = true;
        element('mmianji-review-question').hidden = true;
        const instructions = Array.isArray(data.instructions) ? data.instructions.filter(Boolean).join('\n') : '';
        showResult('mmianji-review-result', `?????????${data.group}${instructions ? `\n\n${instructions}` : ''}`, false);
        element('mmianji-review-restart').hidden = false;
    }
}

async function runReviewStep(action, value) {
    setReviewBusy(true);
    showResult('mmianji-review-result', '??????', false);
    try {
        renderReview(await requestReview(action, value));
    } catch (error) {
        resetReview(error.message || '???????????????');
        element('mmianji-review-restart').hidden = false;
        element('mmianji-review-start').hidden = true;
    } finally {
        setReviewBusy(false);
    }
}

function startCommunityReview() {
    return runReviewStep('start');
}

function submitReviewPledge() {
    const input = element('mmianji-review-pledge-input');
    return runReviewStep('pledge', String(input && input.value || ''));
}

function submitReviewAnswer(value) {
    return runReviewStep('answer', String(value || '').toUpperCase());
}

function installPanel() {
    if (element('mmianji-import-license-panel')) return;
    const host = element('extensions_settings');
    if (!host) return setTimeout(installPanel, 500);
    const panel = makePanel();
    host.appendChild(panel);
    panel.querySelector('.inline-drawer-toggle').addEventListener('click', function () {
        panel.querySelector('.inline-drawer-content').classList.toggle('openDrawer');
        panel.querySelector('.inline-drawer-icon').classList.toggle('down');
        panel.querySelector('.inline-drawer-icon').classList.toggle('up');
    });
    element('mmianji-license-submit').addEventListener('click', submitCode);
    element('mmianji-license-code').addEventListener('keydown', function (event) {
        if (event.key === 'Enter') submitCode();
    });
    element('mmianji-review-start').addEventListener('click', startCommunityReview);
    element('mmianji-review-restart').addEventListener('click', startCommunityReview);
    element('mmianji-review-pledge-submit').addEventListener('click', submitReviewPledge);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installPanel);
else installPanel();
