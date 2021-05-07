defmodule SoupWeb.Router do
  use SoupWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug CORSPlug, origin: "*"
    plug :accepts, ["json"]
  end

  scope "/api", SoupWeb do
    pipe_through :api

    post "/game", GameController, :create
    put "/join_game", GameController, :join_game
    get "/game/:id", GameController, :show

    options "/*anything", GameController, :options
  end

  # scope "/", SoupWeb do
  #   pipe_through :browser

  #   # get "/", PageController, :index
  #   get "/*anything", PageController, :index
  # end

  # Other scopes may use custom stacks.
  # scope "/api", SoupWeb do
  #   pipe_through :api
  # end
end
