// frontend/components/Shop.js
class Shop {
    constructor(telegramUser) {
        this.telegramUser = telegramUser;
        this.gameState = null;
        this.shopItems = null;
        this.activeCategory = 'all';
        this.init();
    }

    async init() {
        await Promise.all([this.loadGameState(), this.loadShopItems()]);
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
        } catch (error) {
            this.showError('Ошибка загрузки состояния');
            console.error('Load state error:', error);
        }
    }

    async loadShopItems() {
        try {
            const response = await fetch('/api/shop/items');
            const data = await response.json();
            
            if (data.items) {
                this.shopItems = data.items;
            }
        } catch (error) {
            this.showError('Ошибка загрузки магазина');
            console.error('Load shop error:', error);
        }
    }

    render() {
        return `
            <div class="shop-container">
                <h2>🛒 Магазин</h2>
                
                <div class="player-balance">
                    <div class="balance-card">
                        <span>💰 Баланс:</span>
                        <span class="balance-amount">${this.gameState?.user?.money || 0}₽</span>
                    </div>
                </div>

                <div class="shop-categories">
                    <button class="category-btn ${this.activeCategory === 'all' ? 'active' : ''}" 
                            onclick="shop.setCategory('all')">Все</button>
                    <button class="category-btn ${this.activeCategory === 'worms' ? 'active' : ''}" 
                            onclick="shop.setCategory('worms')">🪱 Черви</button>
                    <button class="category-btn ${this.activeCategory === 'beer' ? 'active' : ''}" 
                            onclick="shop.setCategory('beer')">🍺 Пиво</button>
                    <button class="category-btn ${this.activeCategory === 'gear' ? 'active' : ''}" 
                            onclick="shop.setCategory('gear')">🎣 Снасти</button>
                    <button class="category-btn ${this.activeCategory === 'bait' ? 'active' : ''}" 
                            onclick="shop.setCategory('bait')">🪱 Наживка</button>
                    <button class="category-btn ${this.activeCategory === 'accessory' ? 'active' : ''}" 
                            onclick="shop.setCategory('accessory')">🔔 Аксессуары</button>
                </div>

                <div class="shop-items">
                    ${this.renderShopItems()}
                </div>

                <div class="bag-upgrade">
                    <h3>🎒 Улучшение подсака</h3>
                    <div class="upgrade-info">
                        Текущий размер: ${this.gameState?.user?.bag_limit || 20} мест
                    </div>
                    <button class="btn btn-primary" onclick="shop.buyBagExtension()">
                        🎒 Расширить подсак (+10 мест)
                    </button>
                </div>
            </div>
        `;
    }

    renderShopItems() {
        if (!this.shopItems) return '<div class="loading">Загрузка...</div>';

        let itemsToShow = [];

        if (this.activeCategory === 'worms') {
            return this.renderWormsSection();
        } else if (this.activeCategory === 'all') {
            itemsToShow = Object.entries(this.shopItems);
        } else {
            itemsToShow = Object.entries(this.shopItems).filter(([_, item]) => item.type === this.activeCategory);
        }

        if (itemsToShow.length === 0) {
            return '<div class="empty-shop">Товаров нет</div>';
        }

        return itemsToShow.map(([name, item]) => this.renderShopItem(name, item)).join('');
    }

    renderWormsSection() {
        return `
            <div class="worms-section">
                <div class="shop-item">
                    <div class="item-header">
                        <div class="item-icon">🪱</div>
                        <div class="item-name">Червь обыкновенный</div>
                    </div>
                    <div class="item-description">Наживка для рыбалки</div>
                    <div class="item-price">💰 10₽ за штуку</div>
                    <div class="item-actions">
                        <button class="btn btn-small" onclick="shop.buyWorms(1)">Купить 1</button>
                        <button class="btn btn-small" onclick="shop.buyWorms(10)">Купить 10</button>
                        <button class="btn btn-small" onclick="shop.buyWorms(50)">Купить 50</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderShopItem(name, item) {
        const canAfford = this.gameState?.user?.money >= item.price;
        const slotOccupied = this.gameState?.equipped_items?.[item.type];
        const effects = this.formatEffects(item.effect);

        return `
            <div class="shop-item ${!canAfford ? 'cannot-afford' : ''}">
                <div class="item-header">
                    <div class="item-icon">${this.getItemIcon(item.type)}</div>
                    <div class="item-name">${name}</div>
                </div>
                <div class="item-type">${this.getTypeName(item.type)}</div>
                <div class="item-effects">${effects}</div>
                <div class="item-price">💰 ${item.price}₽</div>
                <div class="item-actions">
                    <button class="btn btn-small ${canAfford && !slotOccupied ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="shop.buyItem('${name}')"
                            ${!canAfford || slotOccupied ? 'disabled' : ''}>
                        ${!canAfford ? 'Не хватает денег' : slotOccupied ? 'Слот занят' : 'Купить'}
                    </button>
                </div>
            </div>
        `;
    }

    getItemIcon(type) {
        const icons = {
            'beer': '🍺',
            'gear': '🎣',
            'bait': '🪱',
            'accessory': '🔔'
        };
        return icons[type] || '📦';
    }

    getTypeName(type) {
        const names = {
            'beer': '🍺 Пиво',
            'gear': '🎣 Снасть',
            'bait': '🪱 Наживка',
            'accessory': '🔔 Аксессуар'
        };
        return names[type] || type;
    }

    formatEffects(effects) {
        const effectDescriptions = {
            "chance_bonus": (val) => `🎯 Шанс улова: +${(val * 100).toFixed(0)}%`,
            "rare_weight_bonus": (val) => `⚡ Вес редкой: +${(val * 100).toFixed(0)}%`,
            "price_multiplier": (val) => `💰 Множитель цены: x${val.toFixed(1)}`,
            "crit_chance": (val) => `🎲 Шанс крита: +${(val * 100).toFixed(2)}%`
        };

        return Object.entries(effects)
            .map(([key, value]) => effectDescriptions[key]?.(value) || `${key}: ${value}`)
            .join('<br>');
    }

    setCategory(category) {
        this.activeCategory = category;
        this.updateUI();
    }

    async buyItem(itemName) {
        try {
            const response = await fetch('/api/shop/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    user_id: this.telegramUser.id,
                    item_name: itemName 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`✅ Куплен предмет: ${itemName}`);
                await this.loadGameState();
                this.updateUI();
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Ошибка при покупке предмета');
        }
    }

    async buyWorms(count) {
        try {
            const response = await fetch('/api/shop/buy_worms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    user_id: this.telegramUser.id,
                    count: count 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`🪱 Куплено ${count} червей за ${data.cost}₽`);
                await this.loadGameState();
                this.updateUI();
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Ошибка при покупке червей');
        }
    }

    async buyBagExtension() {
        try {
            const response = await fetch('/api/shop/buy_bag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    user_id: this.telegramUser.id
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`🎒 Подсак расширен до ${data.new_bag_limit} мест!`);
                await this.loadGameState();
                this.updateUI();
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Ошибка при улучшении подсака');
        }
    }

    updateUI() {
        const container = document.querySelector('.shop-container');
        if (container) {
            container.innerHTML = this.render();
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

export default Shop;