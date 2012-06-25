RailsConfig.setup do |config|
  config.const_name = "Settings"
end

# Checks for the presence of database.yml
if !File.exist?("#{Rails.root}/config/database.yml")
  abort "ERROR: database.yml missing.  Please copy config/database.template.yml to config/database.yml and configure it for your machine."
end
