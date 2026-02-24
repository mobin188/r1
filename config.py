import os

DEBUG = True
SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-key-change-in-production")
