// frontend/components/Inventory.js
class Inventory {
    constructor(telegramUser) {
        this.telegramUser = telegramUser;
        this.gameState = null;
        this.init();
    }

    async init() {
        await this.loadGameState();
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
            this.showError('Ошибка загрузки инвентаря');
            console.error('Load inventory error:', error);
        }
    }

    render() {
        return `
            <div class="inventory-container">
                <h2>🎒 Инвентарь</h2>
                
                <div class="equipment-section">
                    <h3>🧳 Экипировка</h3>
                    <div class="equipment-slots">
                        ${this.renderEquipmentSlots()}
                    </div>
                </div>

                <div class="inventory-section">
                    <h3>📦 Предметы в инвентаре</h3>
                    <div class="inventory-grid">
                        ${this.renderInventoryItems()}
                    </div>
                </div>
            </div>
        `;
    }

    renderEquipmentSlots() {
        const slots = [
            { key: 'beer', name: '🍺 Пиво', icon: '🍺' },
            { key: 'gear', name: '🎣 Снасть', icon: '🎣' },
            { key: 'bait', name: '🪱 Наживка', icon: '🪱' },
            { key: 'accessory', name: '🔔 Аксессуар', icon: '🔔' }
        ];

        return slots.map(slot => {
            const item = this.gameState?.equipped_items?.[slot.key];
            return `
                <div class="equipment-slot ${item ? 'filled' : ''}">
                    <div class="slot-header">
                        <span class="slot-icon">${slot.icon}</span>
                        <span class="slot-name">${slot.name}</span>
                    </div>
                    ${item ? this.renderEquippedItem(item, slot.key) : '<div class="empty-slot">Пусто</div>'}
                </div>
            `;
        }).join('');
    }

    renderEquippedItem(item, slot) {
        const effects = this.formatEffects(item.effect);
        return `
            <div class="equipped-item">
                <div class="item-name">${item.name}</div>
                <div class="item-durability">🕐 ${item.durability} исп.</div>
                <div class="item-effects">${effects}</div>
                <button class="btn btn-small" onclick="inventory.unequipItem('${slot}')">
                    ❌ Снять
                </button>
            </div>
        `;
    }

    renderInventoryItems() {
        const inventory = this.gameState?.inventory || [];
        
        if (inventory.length === 0) {
            return '<div class="empty-inventory">Инвентарь пуст</div>';
        }

        return inventory.map((item, index) => `
            <div class="inventory-item">
                <div class="item-header">
                    <div class="item-name">${item.name}</div>
                    <div class="item-durability">🕐 ${item.durability} исп.</div>
                </div>
                <div class="item-effects">${this.formatEffects(item.effect)}</div>
                <button class="btn btn-small btn-primary" onclick="inventory.equipItem(${index})">
                    ⚙️ Надеть
                </button>
            </div>
        `).join('');
    }

    formatEffects(effects) {
        const effectDescriptions = {
            "chance_bonus": (val) => `🎯 Шанс: +${(val * 100).toFixed(0)}%`,
            "rare_weight_bonus": (val) => `⚡ Вес: +${(val * 100).toFixed(0)}%`,
            "price_multiplier": (val) => `💰 Цена: x${val.toFixed(1)}`,
            "crit_chance": (val) => `🎲 Крит: +${(val * 100).toFixed(2)}%`
        };

        return Object.entries(effects)
            .map(([key, value]) => effectDescriptions[key]?.(value) || `${key}: ${value}`)
            .join('<br>');
    }

    async unequipItem(slot) {
        try {
            const response = await fetch('/api/equipment/unequip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    user_id: this.telegramUser.id,
                    slot: slot 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`🧳 Предмет снят: ${data.item_unequipped}`);
                await this.loadGameState();
                this.updateUI();
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Ошибка при снятии предмета');
        }
    }

    async equipItem(itemIndex) {
        try {
            const response = await fetch('/api/equipment/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    user_id: this.telegramUser.id,
                    item_index: itemIndex 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`⚙️ Предмет надет: ${data.item_equipped}`);
                await this.loadGameState();
                this.updateUI();
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Ошибка при надевании предмета');
        }
    }

    updateUI() {
        const container = document.querySelector('.inventory-container');
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

export default Inventory;