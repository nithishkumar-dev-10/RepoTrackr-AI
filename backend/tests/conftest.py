import os

os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "15"
os.environ["REFRESH_TOKEN_EXPIRE_DAYS"] = "7"
os.environ["VERIFY_TOKEN_EXPIRE_HOURS"] = "24"
os.environ["RESET_TOKEN_EXPIRE_MINUTES"] = "30"
