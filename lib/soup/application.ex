defmodule Soup.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  def start(_type, _args) do
    # Redlock opts
    readlock_opts = [
      pool_size:                  2,
      drift_factor:               0.01,
      max_retry:                  500,
      retry_interval_base:        30,
      retry_interval_max:         3_000,
      reconnection_interval_base: 500,
      reconnection_interval_max:  5_000,
    
      # you must set odd number of server
      servers: [
        [host: Application.get_env(:soup, :redis)[:host], port: Application.get_env(:soup, :redis)[:port], auth: Application.get_env(:soup, :redis)[:pass]]
      ]
    ]

    # List all child processes to be supervised
    children = [
      # Start the Ecto repository
      # Soup.Repo,
      # Start the endpoint when the application starts
      SoupWeb.Endpoint,
      # Starts a worker by calling: Soup.Worker.start_link(arg)
      # {Soup.Worker, arg},

      {Redix, {Application.get_env(:soup, :redis)[:url], [name: :redix]}},
      {Redlock, readlock_opts}
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Soup.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  def config_change(changed, _new, removed) do
    SoupWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
