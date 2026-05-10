"""
============================================
FAZA.AI — Python Flask Backend Server (Optimized)
server.py
============================================
"""

import os
import json
import time
import logging
from datetime import datetime
from functools import wraps

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv

# Memastikan library anthropic terinstall
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

# ============ KONFIGURASI ============
load_dotenv()

app = Flask(__name__)

# PERBAIKAN: CORS dikonfigurasi agar lebih fleksibel namun tetap aman
CORS(app, resources={r"/*": {"origins": "*"}}) 

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Konfigurasi Environment
API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEFAULT_MODEL = "claude-3-5-sonnet-20240620" # Update ke model terbaru yang stabil
MAX_TOKENS = 4096

# Model mapping
MODEL_MAP = {
    "v2.5": "claude-3-5-sonnet-20240620",
    "v3": "claude-3-opus-20240229",
    "nano": "claude-3-haiku-20240307",
}

# Inisialisasi Anthropic client
client = None
if ANTHROPIC_AVAILABLE and API_KEY:
    try:
        client = anthropic.Anthropic(api_key=API_KEY)
        logger.info("✅ Anthropic client berhasil diinisialisasi")
    except Exception as e:
        logger.error(f"❌ Gagal inisialisasi Anthropic client: {e}")

# ============ HELPERS ============

def validate_messages(messages):
    if not isinstance(messages, list) or len(messages) == 0:
        return False, "Format pesan tidak valid atau kosong"
    return True, None

def build_system_prompt(custom_system=None):
    if custom_system: return custom_system
    return f"Kamu adalah Faza.AI, asisten cerdas. Hari ini: {datetime.now().strftime('%A, %d %B %Y')}"

# ============ ROUTES ============

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json(force=True)
        messages = data.get("messages", [])
        faza_model = data.get("model", "v2.5")
        
        valid, err = validate_messages(messages)
        if not valid:
            return jsonify({"error": err}), 400

        if not client:
            return jsonify({"response": "Server berjalan tanpa API Key (Mode Demo).", "demo": True})

        claude_model = MODEL_MAP.get(faza_model, DEFAULT_MODEL)
        
        response = client.messages.create(
            model=claude_model,
            max_tokens=MAX_TOKENS,
            system=build_system_prompt(data.get("system")),
            messages=messages
        )

        return jsonify({
            "response": response.content[0].text,
            "model": faza_model,
            "tokens": {"total": response.usage.input_tokens + response.usage.output_tokens}
        })

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return jsonify({"error": "Terjadi kesalahan pada server"}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "online", "api_key_set": bool(API_KEY)})

# ============ MAIN ============
if __name__ == '__main__':
    # PERBAIKAN: Menggunakan PORT dinamis untuk kebutuhan Deploy Cloud
    port = int(os.environ.get("PORT", 5000))
    
    print(f"\n🚀 FAZA.AI Server aktif di port: {port}")
    
    app.run(
        host='0.0.0.0', # Penting: agar bisa diakses dari luar localhost
        port=port,
        debug=False
    )
