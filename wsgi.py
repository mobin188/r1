from app import create_app
from config import get_config

# Load configuration and create app
config = get_config()
app = create_app(config)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=config.DEBUG)
