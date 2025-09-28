# backend/game_logic.py
import random
import json
import os
from math import isclose
from datetime import datetime

# Константы игры
DATA_FILE = "users.json"

# Данные игры
fishes = [
    {"name": "Карась", "type": "карась", "min_weight": 0.2, "max_weight": 1.5, "abs_max": 2.5, "price_per_kg": 50},
    {"name": "Щука", "type": "щука", "min_weight": 1.0, "max_weight": 5.0, "abs_max": 35.0, "price_per_kg": 150},
    {"name": "Сом", "type": "сом", "min_weight": 5.0, "max_weight": 50.0, "abs_max": 450.0, "price_per_kg": 200},
]

rare_fishes = [{
    "name": "Золотая рыбка",
    "price_per_kg": 1000000,
    "min_weight": 1.0,
    "max_weight": 1.0,
    "rarity": "legendary"
}]

all_items = {
    "Светлое пиво": {
        "type": "beer",
        "price": 700,
        "effect": {"chance_bonus": 0.05},
    },
    "Крепкое пиво": {
        "type": "beer",
        "price": 7000,
        "effect": {"chance_bonus": 0.1},
    },
    "Сусло древнего рыбака": {
        "type": "beer",
        "price": 210000,
        "effect": {"chance_bonus": 0.2},
    },
    "Светлое нефильтрованное пиво": {
        "type": "beer",
        "price": 500000,
        "effect": {"crit_chance": 0.0025},
    },
    "Жидкое золото": {
        "type": "beer",
        "price": 120000,
        "effect": {"price_multiplier": 1.25},
    },
    "Пиво Большой сом": {
        "type": "beer",
        "price": 125000,
        "effect": {"rare_weight_bonus": 0.07},
    },
    "Ультраблесна": {
        "type": "gear",
        "price": 2800,
        "effect": {"rare_weight_bonus": 0.03},
    },
    "Голографическая блесна": {
        "type": "gear",
        "price": 28000,
        "effect": {"rare_weight_bonus": 0.07},
    },
    "Блесна легенд": {
        "type": "gear",
        "price": 420000,
        "effect": {"rare_weight_bonus": 0.15},
    },
    "Широкая блесна": {
        "type": "gear",
        "price": 500000,
        "effect": {"crit_chance": 0.0025},
    },
    "Золотая блесна": {
        "type": "gear",
        "price": 120000,
        "effect": {"price_multiplier": 1.25},
    },
    "Уловистая блесна": {
        "type": "gear",
        "price": 17000,
        "effect": {"chance_bonus": 0.1},
    },
    "Золотой червь": {
        "type": "bait",
        "price": 1680,
        "effect": {"price_multiplier": 1.1},
    },
    "Алмазная личинка": {
        "type": "bait",
        "price": 21000,
        "effect": {"price_multiplier": 1.25},
    },
    "Икра древнего осетра": {
        "type": "bait",
        "price": 560000,
        "effect": {"price_multiplier": 1.5},
    },
    "Крупный рак": {
        "type": "bait",
        "price": 500000,
        "effect": {"crit_chance": 0.0025},
    },
    "Личинка ручейника": {
        "type": "bait",
        "price": 32000,
        "effect": {"chance_bonus": 0.1},
    },
    "Упитанный мотыль": {
        "type": "bait",
        "price": 125000,
        "effect": {"rare_weight_bonus": 0.07},
    },
    "Колокольчик удачи": {
        "type": "accessory",
        "price": 4900,
        "effect": {"crit_chance": 0.001},
    },
    "Кулон Нептуна": {
        "type": "accessory",
        "price": 70000,
        "effect": {"crit_chance": 0.0025},
    },
    "Амулет великого клёва": {
        "type": "accessory",
        "price": 980000,
        "effect": {"crit_chance": 0.005},
    },
    "Золотой медальон": {
        "type": "accessory",
        "price": 120000,
        "effect": {"price_multiplier": 1.25},
    },
    "Четырехлистный клевер": {
        "type": "accessory",
        "price": 32000,
        "effect": {"chance_bonus": 0.1},
    },
    "Брелок бургер": {
        "type": "accessory",
        "price": 125000,
        "effect": {"rare_weight_bonus": 0.07},
    }
}

achievements_list = [
    {
        "id": "golden_fish",
        "name": "🌟 Исполнилось желание",
        "description": "Поймай Золотую рыбку",
        "condition": lambda fish: fish.get("name") == "Золотая рыбка"
    },
    {
        "id": "fish_weight_14_88",
        "name": "🎯 Бог рыбалки",
        "description": "Поймай рыбу весом ровно 14.88 кг",
        "condition": lambda fish: isclose(fish.get('weight', 0), 14.88, abs_tol=0.01)
    },
    {
        "id": "fish_weight_100",
        "name": "💪 Монстр рыбалки",
        "description": "Поймай рыбу весом более 100 кг",
        "condition": lambda fish: fish.get("weight", 0) > 100
    },
    {
        "id": "rich_5m",
        "name": "🤑 Миллионер",
        "description": "Иметь на счету 5 000 000 рублей и больше",
        "condition": lambda user: user.get("money", 0) >= 5_000_000
    },
    {
        "id": "big_money",
        "name": "💰 Богач",
        "description": "Поймай рыбу дороже 9980₽",
        "condition": lambda fish: fish.get('price', 0) > 9980
    },
    {
        "id": "fish_price_1488",
        "name": "💸 Рыбный миллиардер",
        "description": "Поймай рыбу стоимостью ровно 1488₽",
        "condition": lambda fish: fish.get('price', 0) == 1488
    },
    {
        "id": "pike_weight_2_28",
        "name": "👀 Вот ты и присел",
        "description": "Поймай щуку весом ровно 2.28 кг",
        "condition": lambda fish: fish.get('type', '').lower() == "щука" and isclose(fish.get('weight', 0), 2.28, abs_tol=0.01)
    },
    {
        "id": "catfish_weight_8_12",
        "name": "⚓ Глубины Питера",
        "description": "Поймай сома весом ровно 8.12 кг",
        "condition": lambda fish: fish.get('type', '').lower() == "сом" and isclose(fish.get('weight', 0), 8.12, abs_tol=0.01)
    },
    {
        "id": "fish_price_812",
        "name": "🌉 Северная рыбалка",
        "description": "Поймай рыбу стоимостью ровно 812₽",
        "condition": lambda fish: fish.get('price', 0) == 812
    }
]

effect_descriptions = {
    "chance_bonus": "шанс поймать рыбу +{:.0%}",
    "rare_weight_bonus": "дополнительный вес редкой рыбы +{:.0%}",
    "price_multiplier": "цена рыбы x{:.1f}",
    "crit_chance": "шанс критического улова +{:.2%}"
}

class FishingGame:
    def __init__(self):
        self.users = self.load_users()
    
    def load_users(self):
        """Загрузка данных пользователей"""
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Ошибка загрузки пользователей: {e}")
                return {}
        return {}
    
    def save_users(self):
        """Сохранение данных пользователей"""
        try:
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(self.users, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"Ошибка сохранения пользователей: {e}")
            return False
    
    def register_user(self, user_id, name):
        """Регистрация нового пользователя"""
        user_id = str(user_id)
        
        if user_id not in self.users:
            self.users[user_id] = {
                "name": name,
                "worms": 10,
                "money": 0,
                "catch": [],
                "last_catch": None,
                "achievements": [],
                "bag_limit": 20,
                "inventory": [],
                "items": {
                    "beer": None,
                    "gear": None,
                    "bait": None,
                    "accessory": None
                },
                "created_at": datetime.now().isoformat(),
                "last_active": datetime.now().isoformat()
            }
            self.save_users()
            return {"status": "registered", "user": self.users[user_id]}
        else:
            # Обновляем данные существующего пользователя
            self.users[user_id]["name"] = name
            self.users[user_id]["last_active"] = datetime.now().isoformat()
            
            # Добавляем отсутствующие поля
            if "inventory" not in self.users[user_id]:
                self.users[user_id]["inventory"] = []
            if "items" not in self.users[user_id]:
                self.users[user_id]["items"] = {
                    "beer": None,
                    "gear": None,
                    "bait": None,
                    "accessory": None
                }
            
            self.save_users()
            return {"status": "existing", "user": self.users[user_id]}
    
    def get_user_state(self, user_id):
        """Получение состояния пользователя"""
        user_id = str(user_id)
        if user_id not in self.users:
            return None
        
        user = self.users[user_id]
        
        # Рассчитываем текущие бонусы от предметов
        bonuses = self._calculate_bonuses(user)
        
        return {
            "user": {
                "name": user["name"],
                "money": user["money"],
                "worms": user["worms"],
                "bag_limit": user.get("bag_limit", 20),
                "achievements": user.get("achievements", [])
            },
            "inventory": user.get("inventory", []),
            "equipped_items": user.get("items", {}),
            "podsak": user.get("catch", []),
            "last_catch": user.get("last_catch"),
            "bonuses": bonuses
        }
    
    def _calculate_bonuses(self, user):
        """Расчет бонусов от экипировки"""
        chance_bonus = 0.0
        price_multiplier = 1.0
        rare_weight_bonus = 0.0
        crit_chance = 0.0
        
        for slot in ["beer", "gear", "bait", "accessory"]:
            item = user.get("items", {}).get(slot)
            if item:
                effects = item.get("effect", {})
                chance_bonus += effects.get("chance_bonus", 0.0)
                rare_weight_bonus += effects.get("rare_weight_bonus", 0.0)
                price_multiplier *= effects.get("price_multiplier", 1.0)
                crit_chance += effects.get("crit_chance", 0.0)
        
        return {
            "chance_bonus": chance_bonus,
            "price_multiplier": price_multiplier,
            "rare_weight_bonus": rare_weight_bonus,
            "crit_chance": crit_chance
        }
    
    def _generate_weight(self, fish_data, rare_bonus=0.0):
        """Генерация веса рыбы с учетом бонусов"""
        # Шанс поймать Золотую рыбку (0.0001%)
        if random.random() < 0.000001:
            fish_data = rare_fishes[0]
            return 1.0, fish_data, True
        
        fish_data = random.choice(fishes)
        
        if fish_data["type"] == "сом" and random.random() < (0.001 + rare_bonus):
            weight = round(
                fish_data["max_weight"] + 0.01 +
                min(random.expovariate(1) * 10, 450.0), 2
            )
        else:
            weight = round(random.uniform(fish_data["min_weight"], fish_data["max_weight"]), 2)
        
        return weight, fish_data, False
    
    def _check_achievements(self, user, fish=None):
        """Проверка и выдача достижений"""
        new_achievements = []
        
        for achievement in achievements_list:
            if achievement["id"] not in user.get("achievements", []):
                got_achievement = False
                try:
                    if fish and achievement["condition"](fish):
                        got_achievement = True
                except Exception:
                    pass
                
                if not got_achievement:
                    try:
                        if achievement["condition"](user):
                            got_achievement = True
                    except Exception:
                        pass
                
                if got_achievement:
                    user.setdefault("achievements", []).append(achievement["id"])
                    new_achievements.append(achievement)
        
        return new_achievements
    
    def fish(self, user_id):
        """Процесс рыбалки"""
        user_id = str(user_id)
        if user_id not in self.users:
            return {"error": "User not found"}
        
        user = self.users[user_id]
        
        if user["worms"] <= 0:
            return {"error": "No worms"}
        
        user["worms"] -= 1
        user["last_active"] = datetime.now().isoformat()
        
        # Получаем бонусы
        bonuses = self._calculate_bonuses(user)
        
        # Обновляем прочность предметов
        broken_items = self._update_item_durability(user)
        
        base_fish_chance = 0.7
        
        if random.random() < base_fish_chance + bonuses["chance_bonus"]:
            # Успешная рыбалка
            weight, fish_data, is_golden = self._generate_weight(None, bonuses["rare_weight_bonus"])
            
            if is_golden:
                price = int(weight * fish_data["price_per_kg"] * bonuses["price_multiplier"])
                fish = {
                    "name": fish_data["name"],
                    "weight": weight,
                    "price": price,
                    "type": "золотая",
                    "is_golden": True,
                    "caught_at": datetime.now().isoformat()
                }
            else:
                price = int(weight * fish_data["price_per_kg"] * bonuses["price_multiplier"])
                fish = {
                    "name": fish_data["name"],
                    "weight": weight,
                    "price": price,
                    "type": fish_data["type"],
                    "caught_at": datetime.now().isoformat()
                }
            
            user["last_catch"] = fish
            
            # Проверка достижений
            new_achievements = self._check_achievements(user, fish)
            
            self.save_users()
            
            result = {
                "success": True,
                "fish": fish,
                "new_achievements": [{"name": ach["name"], "description": ach["description"]} for ach in new_achievements],
                "worms_left": user["worms"],
                "broken_items": broken_items
            }
            
            # Проверяем на гигантскую рыбу (для уведомлений)
            if weight > 200 and not is_golden:
                result["is_giant"] = True
            
            return result
        else:
            # Неудачная рыбалка
            user["last_catch"] = None
            self.save_users()
            
            fail_messages = [
                "Леска запуталась в камышах 🌿 и ты устроил бой с природой 1v1.",
                "Ты зевнул... и удочка улетела в воду 😴🎣🌊",
                "Рыба смотрела, но сказала: «не сегодня» 🐟🙅‍♂️",
                "Пока ты ковырялся в инвентаре, червь сбежал 🐛💨",
                "Ты поймал носок. Опытный. С характером. 🧦",
                "Местные рыбы подписаны на другого рыбака 📱🎣",
                "Щука показала тебе средний плавник и уплыла 🖕🐟",
                "Пиво закончилось — и рыба сказала «до свидания» 🍺➡️🚫"
            ]
            
            return {
                "success": False,
                "message": random.choice(fail_messages),
                "worms_left": user["worms"],
                "broken_items": broken_items
            }
    
    def _update_item_durability(self, user):
        """Обновление прочности предметов и возврат сломанных"""
        broken_items = []
        
        for slot in ["beer", "gear", "bait", "accessory"]:
            item = user.get("items", {}).get(slot)
            if item:
                if "durability" not in item:
                    item["durability"] = 500
                
                item["durability"] -= 1
                
                if item["durability"] <= 0:
                    broken_items.append(item["name"])
                    user["items"][slot] = None
        
        return broken_items
    
    def sell_fish(self, user_id):
        """Продажа последней пойманной рыбы"""
        user_id = str(user_id)
        if user_id not in self.users:
            return {"error": "User not found"}
        
        user = self.users[user_id]
        fish = user.get("last_catch")
        
        if not fish:
            return {"error": "No fish to sell"}
        
        user["money"] += fish["price"]
        user["last_catch"] = None
        user["last_active"] = datetime.now().isoformat()
        
        self.save_users()
        
        return {
            "success": True,
            "money_earned": fish["price"],
            "new_balance": user["money"],
            "fish_sold": fish
        }
    
    def keep_fish(self, user_id):
        """Сохранить рыбу в подсак"""
        user_id = str(user_id)
        if user_id not in self.users:
            return {"error": "User not found"}
        
        user = self.users[user_id]
        fish = user.get("last_catch")
        
        if not fish:
            return {"error": "No fish to keep"}
        
        if len(user["catch"]) >= user.get("bag_limit", 20):
            return {"error": "Podsak full"}
        
        user["catch"].append(fish)
        user["last_catch"] = None
        user["last_active"] = datetime.now().isoformat()
        
        self.save_users()
        
        return {
            "success": True,
            "fish_kept": fish,
            "podsak_count": len(user["catch"])
        }
    
    def sell_fish_from_podsak(self, user_id, fish_index):
        """Продажа рыбы из подсака"""
        user_id = str(user_id)
        if user_id not in self.users:
            return {"error": "User not found"}
        
        user = self.users[user_id]
        
        if fish_index < 0 or fish_index >= len(user["catch"]):
            return {"error": "Invalid fish index"}
        
        fish = user["catch"].pop(fish_index)
        user["money"] += fish["price"]
        user["last_active"] = datetime.now().isoformat()
        
        self.save_users()
        
        return {
            "success": True,
            "money_earned": fish["price"],
            "new_balance": user["money"],
            "fish_sold": fish
        }
    
    def buy_item(self, user_id, item_name):
        """Покупка предмета в магазине"""
        user_id = str(user_id)
        if user_id not in self.users:
            return {"error": "User not found"}
        
        if item_name not in all_items:
            return {"error": "Item not found"}
        
        user = self.users[user_id]
        item_info = all_items[item_name]
        price = item_info["price"]
        
        if user["money"] < price:
            return {"error": "Not enough money"}
        
        # Проверяем, свободен ли слот
        slot = item_info["type"]
        if user["items"].get(slot) is not None:
            return {"error": "Slot occupied"}
        
        # Покупка
        user["money"] -= price
        user["items"][slot] = {
            "name": item_name,
            "durability": 500,
            "effect": item_info["effect"]
        }
        user["last_active"] = datetime.now().isoformat()
        
        self.save_users()
        
        return {
            "success": True,
            "item_bought": item_name,
            "new_balance": user["money"]
        }
    
    def buy_worms(self, user_id, count):
        """Покупка червей"""
        user_id = str(user_id)
        if user_id not in self.users:
            return {"error": "User not found"}
        
        user = self.users[user_id]
        cost = count * 10
        
        if user["money"] < cost:
            return {"error": "Not enough money"}
        
        user["money"] -= cost
        user["worms"] += count
        user["last_active"] = datetime.now().isoformat()
        
        self.save_users()
        
        return {
            "success": True,
            "worms_bought": count,
            "cost": cost,
            "new_balance": user["money"],
            "total_worms": user["worms"]
        }
    
    def buy_bag_extension(self, user_id):
        """Покупка расширения подсака"""
        user_id = str(user_id)
        if user_id not in self.users:
            return {"error": "User not found"}
        
        user = self.users[user_id]
        current_limit = user.get("bag_limit", 20)
        
        # Стоимость зависит от текущего размера
        cost = 10_000_000 if current_limit >= 40 else 500_000
        
        if user["money"] < cost:
            return {"error": "Not enough money"}
        
        user["money"] -= cost
        user["bag_limit"] = current_limit + 10
        user["last_active"] = datetime.now().isoformat()
        
        self.save_users()
        
        return {
            "success": True,
            "new_bag_limit": user["bag_limit"],
            "cost": cost,
            "new_balance": user["money"]
        }
    
    def unequip_item(self, user_id, slot):
        """Снять предмет из слота"""
        user_id = str(user_id)
        if user_id not in self.users:
            return {"error": "User not found"}
        
        user = self.users[user_id]
        valid_slots = ["beer", "gear", "bait", "accessory"]
        
        if slot not in valid_slots:
            return {"error": "Invalid slot"}
        
        item = user["items"].get(slot)
        if not item:
            return {"error": "Slot already empty"}
        
        # Если предмет еще имеет прочность, добавляем в инвентарь
        if item.get("durability", 0) > 0:
            user.setdefault("inventory", []).append(item)
        
        user["items"][slot] = None
        user["last_active"] = datetime.now().isoformat()
        
        self.save_users()
        
        return {
            "success": True,
            "item_unequipped": item["name"],
            "slot": slot
        }
    
    def equip_item(self, user_id, item_index):
        """Экипировать предмет из инвентаря"""
        user_id = str(user_id)
        if user_id not in self.users:
            return {"error": "User not found"}
        
        user = self.users[user_id]
        inventory = user.get("inventory", [])
        
        if item_index < 0 or item_index >= len(inventory):
            return {"error": "Invalid item index"}
        
        item = inventory[item_index]
        item_type = all_items.get(item["name"], {}).get("type")
        
        if not item_type:
            return {"error": "Unknown item type"}
        
        # Проверяем, свободен ли слот
        if user["items"].get(item_type) is not None:
            return {"error": "Slot occupied"}
        
        # Экипируем предмет
        user["items"][item_type] = item
        del inventory[item_index]
        user["last_active"] = datetime.now().isoformat()
        
        self.save_users()
        
        return {
            "success": True,
            "item_equipped": item["name"],
            "slot": item_type
        }
    
    def get_top_players(self, limit=10):
        """Получение топа игроков"""
        if not self.users:
            return []
        
        sorted_users = sorted(self.users.items(), key=lambda x: x[1]["money"], reverse=True)
        
        top_list = []
        for i, (user_id, user_data) in enumerate(sorted_users[:limit], 1):
            top_list.append({
                "rank": i,
                "name": user_data["name"],
                "money": user_data["money"],
                "achievements_count": len(user_data.get("achievements", []))
            })
        
        return top_list
    
    def get_achievements(self, user_id=None):
        """Получение достижений"""
        if not user_id:
            return achievements_list
        
        user_id = str(user_id)
        if user_id not in self.users:
            return {"error": "User not found"}
        
        user = self.users[user_id]
        user_achievements = user.get("achievements", [])
        
        achievements_with_status = []
        for ach in achievements_list:
            achievements_with_status.append({
                "id": ach["id"],
                "name": ach["name"],
                "description": ach["description"],
                "unlocked": ach["id"] in user_achievements
            })
        
        return achievements_with_status
    
    def get_shop_items(self):
        """Получение предметов магазина"""
        return all_items

# Создаем глобальный экземпляр игры
game_instance = FishingGame()