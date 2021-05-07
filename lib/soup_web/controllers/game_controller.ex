defmodule SoupWeb.GameController do
  use SoupWeb, :controller
  require Logger

  alias Soup.Game
  alias Soup.Game.{GameSession, Player}

  @doc """
  Creates a new game
  """
  def create(conn, %{"name" => name, "color" => color, "totalRounds" => total_rounds}) do
    case GameSession.new_game_session(total_rounds) do
      {:ok, session} ->
        player = Player.new_player(name, color, true)
        session
        |> GameSession.add_player(player)

        conn |>
        send_resp(200, Poison.encode!(%{session: session, player: player}))
      {:error, reason} ->
        conn
        |> send_resp(500, reason)
    end
  end


  @doc """
  Returns a game along with it's players and piles given a game Id
  """
  def show(conn, %{"id" => session_id}) do
    case GameSession.get_session(session_id) do
      {:ok, game} ->
        players = GameSession.get_all_players(session_id)
        |> Enum.sort_by(fn p -> p.rank end)

        piles = GameSession.get_all_piles(session_id)

        conn
        |> send_resp(200, Poison.encode!(%{game: game, players: players, piles: piles}))
      _ ->
        conn
        |> send_resp(404, "Game not found")
      end
  end


  @doc """
  Handles a player's request to join a game
  """
  def join_game(conn, params) do
    player = Player.new_player(params["name"], params["color"])
    
    case GameSession.get_session(String.upcase(params["sessionId"])) do
      {:ok, session} ->
        case session |> GameSession.add_player(player) do
          {:error, :name_already_taken} ->
            conn
            |> send_resp(500, "That name is already taken")
          _ ->
            session
              |> GameSession.add_player(player)
              
              conn
              |> send_resp(200, Poison.encode!(%{session: session, player: player}))
        end
      {:error, :not_found} ->
        conn
        |> send_resp(404, "Game not found");
      {:error, reason} ->
        conn
        |> send_resp(500, reason)
    end
  end

  def options(conn, _) do
    conn
  end
end