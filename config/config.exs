# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
use Mix.Config

config :soup,
  ecto_repos: [Soup.Repo]

# Configures the endpoint
config :soup, SoupWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "Pn63K7FZOHEohsG2KrcIO085QKck3FdOZza9Nw5ls2dhDFcoDvVehdnu5X2SlMng",
  render_errors: [view: SoupWeb.ErrorView, accepts: ~w(html json)],
  pubsub: Soup.PubSub

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
