# backend/app.py (ПОЛНАЯ ВЕРСИЯ)
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from game_logic import game_instance
import os

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "https://your-app.vercel.app",  # замените на ваш домен
            "https://your-app.netlify.app"  # или netlify
        ]
    }
})

# Создаем папку для фронтенда если её нет
if not os.path.exists('../frontend'):
    os.makedirs('../frontend')

@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend', path)

@app.route('/api/init', methods=['POST'])
def init_user():
    data = request.json
    user_id = data.get('user_id')
    name = data.get('name', 'Рыбак')
    return jsonify(game_instance.register_user(user_id, name))

@app.route('/api/game/state', methods=['GET'])
def get_game_state():
    user_id = request.args.get('user_id')
    state = game_instance.get_user_state(user_id)
    if state is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify(state)

@app.route('/api/game/fish', methods=['POST'])
def fish():
    data = request.json
    user_id = data.get('user_id')
    result = game_instance.fish(user_id)
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

@app.route('/api/game/sell', methods=['POST'])
def sell_fish():
    data = request.json
    user_id = data.get('user_id')
    result = game_instance.sell_fish(user_id)
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

@app.route('/api/game/keep', methods=['POST'])
def keep_fish():
    data = request.json
    user_id = data.get('user_id')
    result = game_instance.keep_fish(user_id)
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

@app.route('/api/game/sellfish', methods=['POST'])
def sell_fish_from_podsak():
    data = request.json
    user_id = data.get('user_id')
    fish_index = data.get('fish_index')
    result = game_instance.sell_fish_from_podsak(user_id, fish_index)
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

@app.route('/api/shop/items', methods=['GET'])
def get_shop_items():
    items = game_instance.get_shop_items()
    return jsonify({"items": items})

@app.route('/api/shop/buy', methods=['POST'])
def buy_item():
    data = request.json
    user_id = data.get('user_id')
    item_name = data.get('item_name')
    result = game_instance.buy_item(user_id, item_name)
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

@app.route('/api/shop/buy_worms', methods=['POST'])
def buy_worms():
    data = request.json
    user_id = data.get('user_id')
    count = data.get('count', 1)
    result = game_instance.buy_worms(user_id, count)
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

@app.route('/api/shop/buy_bag', methods=['POST'])
def buy_bag_extension():
    data = request.json
    user_id = data.get('user_id')
    result = game_instance.buy_bag_extension(user_id)
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

@app.route('/api/equipment/unequip', methods=['POST'])
def unequip_item():
    data = request.json
    user_id = data.get('user_id')
    slot = data.get('slot')
    result = game_instance.unequip_item(user_id, slot)
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

@app.route('/api/equipment/equip', methods=['POST'])
def equip_item():
    data = request.json
    user_id = data.get('user_id')
    item_index = data.get('item_index')
    result = game_instance.equip_item(user_id, item_index)
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

@app.route('/api/top', methods=['GET'])
def get_top_players():
    limit = request.args.get('limit', 10, type=int)
    top_players = game_instance.get_top_players(limit)
    return jsonify({"top_players": top_players})

@app.route('/api/achievements', methods=['GET'])
def get_achievements():
    user_id = request.args.get('user_id')
    if user_id:
        achievements = game_instance.get_achievements(user_id)
        if isinstance(achievements, dict) and 'error' in achievements:
            return jsonify(achievements), 404
        return jsonify({"achievements": achievements})
    else:
        achievements = game_instance.get_achievements()
        return jsonify({"all_achievements": achievements})

@app.route('/api/user/inventory', methods=['GET'])
def get_user_inventory():
    user_id = request.args.get('user_id')
    state = game_instance.get_user_state(user_id)
    if state is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"inventory": state.get("inventory", [])})

@app.route('/api/user/equipment', methods=['GET'])
def get_user_equipment():
    user_id = request.args.get('user_id')
    state = game_instance.get_user_state(user_id)
    if state is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"equipment": state.get("equipped_items", {})})

@app.route('/api/user/podsak', methods=['GET'])
def get_user_podsak():
    user_id = request.args.get('user_id')
    state = game_instance.get_user_state(user_id)
    if state is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"podsak": state.get("podsak", [])})

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "users_count": len(game_instance.users),
        "message": "Fishing Game API is running"
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    print("🚀 Fishing Game API запущен на http://localhost:5000")
    print("📊 Загружено пользователей:", len(game_instance.users))
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)