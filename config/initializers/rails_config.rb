RailsConfig.setup do |config|
  config.const_name = "Settings"
end

# Checks for the presence of database.yml
if !File.exist?("#{Rails.root}/config/database.yml")
  abort "ERROR: database.yml missing.  Please copy config/database.template.yml to config/database.yml and configure it for your machine."
end

# Check for a local.yml file
if !File.exist?("#{Rails.root}/config/settings/local.yml")
  abort "ERROR: local.yml missing.  Please copy config/settings/local.template.yml to config/settings/local.yml and configure it for your machine."
end

# Add local configuration for settings that are locally overrided
Settings.add_source!("#{Rails.root}/config/settings/local.yml")
Settings.add_source!("#{Rails.root}/config/settings/local_#{Rails.root}.yml")
Settings.reload!

# Load secret token

secret_token = Settings.secret_token
if !secret_token.blank?
  Rails.application.config.secret_token = secret_token
else
  abort "ERROR: No secret token provided.  Please assign a random secret_token to local.yml."
end
