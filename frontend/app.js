// frontend/app.js
import GameInterface from './components/GameInterface.js';
import Inventory from './components/Inventory.js';
import Shop from './components/Shop.js';

class FishingGameApp {
    constructor() {
        this.telegramUser = null;
        this.currentView = 'game';
        this.gameInterface = null;
        this.inventory = null;
        this.shop = null;
        this.API_BASE_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:5000' 
            : 'https://your-backend.railway.app'; // замените на реальный URL
        
        this.telegramUser = null;
        this.currentView = 'game';
        this.init();
    }

     async apiCall(endpoint, options = {}) {
        const url = `${this.API_BASE_URL}${endpoint}`;
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async loadGameState() {
        try {
            const data = await this.apiCall(`/api/game/state?user_id=${this.telegramUser.id}`);
            if (data.error) {
                this.showError(data.error);
                return;
            }
            this.gameState = data;
        } catch (error) {
            this.showError('Ошибка загрузки состояния игры');
        }
    }

    async castFishingRod() {
        try {
            const result = await this.apiCall('/api/game/fish', {
                method: 'POST',
                body: JSON.stringify({ user_id: this.telegramUser.id })
            });
            // ... обработка результата
        } catch (error) {
            this.showError('Ошибка при рыбалке');
        }
    }

    async init() {
        await this.initTelegram();
        this.initComponents();
        this.render();
        this.setupNavigation();
    }

    async initTelegram() {
        if (window.Telegram && window.Telegram.WebApp) {
            // Режим Telegram Web App
            this.tg = window.Telegram.WebApp;
            this.tg.expand();
            this.tg.enableClosingConfirmation();
            
            this.telegramUser = this.tg.initDataUnsafe.user;
            if (!this.telegramUser) {
                this.showError('Ошибка авторизации Telegram');
                return;
            }
        } else {
            // Режим разработки (без Telegram)
            this.telegramUser = { 
                id: 'dev_user_' + Date.now(), 
                first_name: 'Тестовый Игрок',
                username: 'test_user'
            };
            console.log('🔧 Режим разработки активирован');
        }

        // Инициализация пользователя на сервере
        try {
            const response = await fetch('/api/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.telegramUser.id,
                    name: this.telegramUser.first_name
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'registered') {
                console.log('🎮 Новый пользователь зарегистрирован');
            } else if (data.status === 'existing') {
                console.log('🎮 Существующий пользователь загружен');
            }
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showError('Не удалось подключиться к серверу');
        }
    }

    initComponents() {
        this.gameInterface = new GameInterface(this.telegramUser);
        this.inventory = new Inventory(this.telegramUser);
        this.shop = new Shop(this.telegramUser);
    }

    render() {
        const appContainer = document.getElementById('app');
        if (!appContainer) return;

        appContainer.innerHTML = `
            <div class="app-container">
                <header class="app-header">
                    <h1>🎣 Рыбалка Web</h1>
                    <div class="user-info">
                        <span class="user-name">${this.telegramUser?.first_name || 'Игрок'}</span>
                    </div>
                </header>

                <nav class="main-nav">
                    <button class="nav-btn ${this.currentView === 'game' ? 'active' : ''}" data-view="game">
                        🎮 Игра
                    </button>
                    <button class="nav-btn ${this.currentView === 'inventory' ? 'active' : ''}" data-view="inventory">
                        🎒 Инвентарь
                    </button>
                    <button class="nav-btn ${this.currentView === 'shop' ? 'active' : ''}" data-view="shop">
                        🛒 Магазин
                    </button>
                    <button class="nav-btn" data-view="top">
                        🏆 Топ
                    </button>
                    <button class="nav-btn" data-view="achievements">
                        ⭐ Достижения
                    </button>
                </nav>

                <main class="main-content">
                    <div id="content-area"></div>
                </main>

                <div id="notification-container"></div>
            </div>
        `;

        this.renderCurrentView();
    }

    renderCurrentView() {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;

        switch (this.currentView) {
            case 'game':
                contentArea.innerHTML = this.gameInterface?.render() || '<div>Загрузка игры...</div>';
                this.gameInterface?.setupEventListeners();
                break;
            
            case 'inventory':
                contentArea.innerHTML = this.inventory?.render() || '<div>Загрузка инвентаря...</div>';
                break;
            
            case 'shop':
                contentArea.innerHTML = this.shop?.render() || '<div>Загрузка магазина...</div>';
                break;
            
            case 'top':
                contentArea.innerHTML = this.renderTopPlayers();
                break;
            
            case 'achievements':
                contentArea.innerHTML = this.renderAchievements();
                break;
            
            default:
                contentArea.innerHTML = '<div>Выберите раздел</div>';
        }
    }

    async renderTopPlayers() {
        try {
            const response = await fetch('/api/top?limit=10');
            const data = await response.json();
            
            if (data.top_players) {
                return `
                    <div class="top-players">
                        <h2>🏆 Топ игроков</h2>
                        <div class="top-list">
                            ${data.top_players.map(player => `
                                <div class="top-player ${player.rank <= 3 ? 'top-three' : ''}">
                                    <div class="player-rank">${player.rank}</div>
                                    <div class="player-name">${player.name}</div>
                                    <div class="player-money">${player.money}₽</div>
                                    <div class="player-achievements">⭐ ${player.achievements_count}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Ошибка загрузки топа:', error);
        }
        
        return '<div class="error">Не удалось загрузить топ игроков</div>';
    }

    async renderAchievements() {
        try {
            const response = await fetch(`/api/achievements?user_id=${this.telegramUser.id}`);
            const data = await response.json();
            
            if (data.achievements) {
                return `
                    <div class="achievements-container">
                        <h2>⭐ Достижения</h2>
                        <div class="achievements-list">
                            ${data.achievements.map(ach => `
                                <div class="achievement-item ${ach.unlocked ? 'unlocked' : 'locked'}">
                                    <div class="achievement-icon">
                                        ${ach.unlocked ? '✅' : '🔒'}
                                    </div>
                                    <div class="achievement-info">
                                        <div class="achievement-name">${ach.name}</div>
                                        <div class="achievement-desc">${ach.description}</div>
                                    </div>
                                    <div class="achievement-status">
                                        ${ach.unlocked ? 'Получено' : 'Не получено'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Ошибка загрузки достижений:', error);
        }
        
        return '<div class="error">Не удалось загрузить достижения</div>';
    }

    setupNavigation() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-btn')) {
                const view = e.target.dataset.view;
                this.switchView(view);
            }
        });
    }

    switchView(view) {
        this.currentView = view;
        
        // Обновляем активные кнопки навигации
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        this.renderCurrentView();
        
        // Обновляем данные для некоторых вьюх
        if (view === 'top' || view === 'achievements') {
            setTimeout(() => this.renderCurrentView(), 100);
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                ${message}
            </div>
        `;

        container.appendChild(notification);

        // Анимация появления
        setTimeout(() => notification.classList.add('show'), 10);

        // Автоудаление
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showError(message) {
        this.showNotification(`❌ ${message}`, 'error');
    }

    showSuccess(message) {
        this.showNotification(`✅ ${message}`, 'success');
    }
}

// Глобальные функции для использования в компонентах
window.switchView = (view) => {
    if (window.fishingApp) {
        window.fishingApp.switchView(view);
    }
};

window.showNotification = (message, type) => {
    if (window.fishingApp) {
        window.fishingApp.showNotification(message, type);
    }
};

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.fishingApp = new FishingGameApp();
});

// Глобальные объекты для компонентов
window.gameInterface = null;
window.inventory = null;
window.shop = null;