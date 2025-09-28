// frontend/components/GameInterface.js
class GameInterface {
    constructor(telegramUser) {
        this.telegramUser = telegramUser;
        this.gameState = null;
        this.isFishing = false;
        this.currentAnimation = '';
        this.init();
    }

    async init() {
        await this.loadGameState();
        this.render();
        this.setupEventListeners();
    }

    async loadGameState() {
        try {
            const response = await fetch(`/api/game/state?user_id=${this.telegramUser.id}`);
            const data = await response.json();
            
            if (data.error) {
                this.showError(data.error);
                return;
            }
            
            this.gameState = data;
            this.updateUI();
        } catch (error) {
            this.showError('Ошибка загрузки состояния игры');
            console.error('Load state error:', error);
        }
    }

    render() {
        return `
            <div class="game-interface">
                <div class="header">
                    <h1>🎣 Рыбалка Web</h1>
                    <div class="player-name">${this.gameState?.user?.name || 'Игрок'}</div>
                </div>

                <div class="player-stats">
                    <div class="stat-card">
                        <div>💰 Деньги</div>
                        <div class="stat-value">${this.gameState?.user?.money || 0}₽</div>
                    </div>
                    <div class="stat-card">
                        <div>🪱 Черви</div>
                        <div class="stat-value">${this.gameState?.user?.worms || 0}</div>
                    </div>
                </div>

                <div class="fishing-area ${this.currentAnimation}">
                    <div class="water">
                        <div class="waves"></div>
                    </div>
                    <div class="fisherman">
                        <div class="fishing-rod">
                            <div class="fishing-line">
                                <div class="fish-hook"></div>
                            </div>
                        </div>
                    </div>
                    <div class="fish-caught" id="fishCaught"></div>
                </div>

                <div class="action-buttons">
                    <button class="btn btn-primary" id="fishBtn" ${this.isFishing || !this.gameState?.user?.worms ? 'disabled' : ''}>
                        ${this.isFishing ? '🎣 Забрасываем...' : (this.gameState?.user?.worms <= 0 ? '🪱 Нет червей' : '🎣 Закинуть удочку')}
                    </button>
                    <button class="btn btn-secondary" id="sellBtn" ${!this.gameState?.last_catch ? 'disabled' : ''}>
                        💰 Продать
                    </button>
                </div>

                <div class="bonuses-info">
                    ${this.renderBonuses()}
                </div>
            </div>
        `;
    }

    renderBonuses() {
        if (!this.gameState?.bonuses) return '';
        
        const bonuses = this.gameState.bonuses;
        let bonusText = '';

        if (bonuses.chance_bonus > 0) {
            bonusText += `🎯 Шанс: +${(bonuses.chance_bonus * 100).toFixed(0)}% `;
        }
        if (bonuses.price_multiplier > 1) {
            bonusText += `💰 Цена: x${bonuses.price_multiplier.toFixed(1)} `;
        }
        if (bonuses.rare_weight_bonus > 0) {
            bonusText += `⚡ Редкость: +${(bonuses.rare_weight_bonus * 100).toFixed(0)}% `;
        }
        if (bonuses.crit_chance > 0) {
            bonusText += `🎲 Крит: +${(bonuses.crit_chance * 100).toFixed(2)}%`;
        }

        return bonusText ? `<div class="bonuses">${bonusText}</div>` : '';
    }

    setupEventListeners() {
        document.getElementById('fishBtn')?.addEventListener('click', () => this.castFishingRod());
        document.getElementById('sellBtn')?.addEventListener('click', () => this.sellFish());
    }

    async castFishingRod() {
        if (this.isFishing || !this.gameState?.user?.worms) return;

        this.isFishing = true;
        this.currentAnimation = 'casting';
        this.updateUI();

        try {
            const response = await fetch('/api/game/fish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: this.telegramUser.id })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showFishCaught(result.fish);
                if (result.new_achievements?.length > 0) {
                    result.new_achievements.forEach(ach => {
                        this.showNotification(`🏆 ${ach.name}`);
                    });
                }
            } else {
                this.showNotification(result.message);
            }
            
            await this.loadGameState();
            
        } catch (error) {
            this.showError('Ошибка при рыбалке');
            console.error('Fishing error:', error);
        }

        setTimeout(() => {
            this.isFishing = false;
            this.currentAnimation = '';
            this.updateUI();
        }, 1000);
    }

    showFishCaught(fish) {
        const fishCaught = document.getElementById('fishCaught');
        let fishIcon = '🐟';
        
        if (fish.type === 'щука') fishIcon = '🐊';
        else if (fish.type === 'сом') fishIcon = '🐠';
        else if (fish.is_golden) fishIcon = '🌟';
        
        fishCaught.innerHTML = `<div class="fish-icon">${fishIcon}</div>`;
        fishCaught.style.display = 'block';

        setTimeout(() => {
            fishCaught.style.display = 'none';
            this.showFishModal(fish);
        }, 1500);
    }

    showFishModal(fish) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-fish">${fish.is_golden ? '🌟' : '🐟'}</div>
                <h3>${fish.name}</h3>
                <p>Вес: ${fish.weight}кг | Цена: ${fish.price}₽</p>
                <div class="action-buttons">
                    <button class="btn btn-primary" id="keepFishBtn">📦 В подсак</button>
                    <button class="btn btn-secondary" id="sellFishBtn">💰 Продать</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);

        document.getElementById('keepFishBtn').addEventListener('click', () => {
            this.keepFish();
            modal.remove();
        });

        document.getElementById('sellFishBtn').addEventListener('click', () => {
            this.sellFish();
            modal.remove();
        });
    }

    async keepFish() {
        try {
            const response = await fetch('/api/game/keep', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: this.telegramUser.id })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`📦 ${data.fish_kept.name} добавлена в подсак`);
                await this.loadGameState();
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Ошибка при сохранении рыбы');
        }
    }

    async sellFish() {
        try {
            const response = await fetch('/api/game/sell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: this.telegramUser.id })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`💰 Продано за ${data.money_earned}₽`);
                await this.loadGameState();
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Ошибка при продаже рыбы');
        }
    }

    updateUI() {
        // Обновляем DOM с новым состоянием
        const container = document.querySelector('.game-interface');
        if (container) {
            container.innerHTML = this.render();
            this.setupEventListeners();
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification active';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        this.showNotification('❌ ' + message);
    }
}

export default GameInterface;