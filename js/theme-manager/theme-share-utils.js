/**
 * Theme sharing utilities
 */

const emubro = window.emubro;
const log = console;

async function askForWebhookUrl() {
    const modal = document.getElementById('webhook-modal');
    const input = document.getElementById('webhook-input');
    const saveBtn = document.getElementById('webhook-save-btn');
    const cancelBtn = document.getElementById('webhook-cancel-btn');

    if (!modal) {
        console.error('Webhook modal not found');
        return null;
    }

    input.value = '';
    modal.style.display = 'flex';

    const webhookUrl = await new Promise((resolve) => {
        const cleanup = () => {
            saveBtn.removeEventListener('click', onSave);
            cancelBtn.removeEventListener('click', onCancel);
        };

        const onSave = () => {
            const url = input.value.trim();
            const webhookDefaultUrl = 'https://discord.com/api/webhooks/';
            if (!url.startsWith(webhookDefaultUrl)) {
                const errorMsg = i18n.t('webhook.invalidUrl', { url: webhookDefaultUrl });
                alert(errorMsg);
                return;
            }
            localStorage.setItem('discordWebhookUrl', url);
            modal.style.display = 'none';
            cleanup();
            resolve(url);
        };

        const onCancel = () => {
            modal.style.display = 'none';
            cleanup();
            resolve(null);
        };

        saveBtn.addEventListener('click', onSave);
        cancelBtn.addEventListener('click', onCancel);
    });

    return webhookUrl;
}

export async function uploadTheme(theme) {
    let webhookUrl = localStorage.getItem('discordWebhookUrl');

    if (!webhookUrl) {
        webhookUrl = await askForWebhookUrl();
        if (!webhookUrl) return;
    }

    const userInfo = await emubro.invoke('get-user-info');

    let imageName = window.currentBackgroundImageName || 'background';
    let topImageName = window.currentTopBackgroundImageName || 'top-background';

    if (imageName === 'background' && theme.background && theme.background.image && theme.background.image.startsWith('data:')) {
        const mimeType = theme.background.image.split(';base64,')[0].split(':')[1];
        const extension = mimeType.split('/')[1];
        imageName = `background.${extension}`;
    }

    if (topImageName === 'top-background' && theme.background && theme.background.topImage && theme.background.topImage.startsWith('data:')) {
        const topMimeType = theme.background.topImage.split(';base64,')[0].split(':')[1];
        const topExtension = topMimeType.split('/')[1];
        topImageName = `top-background.${topExtension}`;
    }

    const themeToUpload = JSON.parse(JSON.stringify(theme));
    if (themeToUpload.background && themeToUpload.background.image) {
        themeToUpload.background.image = imageName;
    }
    if (themeToUpload.background && themeToUpload.background.topImage) {
        themeToUpload.background.topImage = topImageName;
    }
    const success = await emubro.invoke('upload-theme', {
        author: userInfo.username,
        name: theme.name,
        themeObject: themeToUpload,
        base64Image: theme.background.image,
        topBase64Image: theme.background.topImage || null,
        webhookUrl: webhookUrl
    });

    if (success) {
        console.info('Theme and image uploaded successfully!');
    } else {
        log.error('Theme upload failed. Webhook might be invalid.');
        localStorage.removeItem('discordWebhookUrl');
        alert(i18n.t('webhook.uploadFailed') || 'Upload failed. Please check your webhook URL and try again.');

        const newWebhookUrl = await askForWebhookUrl();
        if (newWebhookUrl) {
            await uploadTheme(theme);
        }
    }
}
