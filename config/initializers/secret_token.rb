# Be sure to restart your server when you modify this file.

# Your secret key for verifying the integrity of signed cookies.
# If you change this key, all old signed cookies will become invalid!
# Make sure the secret is at least 30 characters and all random,
# no regular words or you'll be exposed to dictionary attacks.
secret_token = Settings.secret_token
abort "ERROR: No secret token provided.  Please assign a random secret_token to local.yml." if secret_token.blank?
Rails.application.config.secret_token = secret_token
