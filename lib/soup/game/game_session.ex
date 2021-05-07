defmodule Soup.Game.GameSession do
  defstruct [:id, :state, :current_round, :total_rounds]

  alias Soup.Game.{IdGen, GameSession, Player, Pile}

  @doc """
  Creates a new game session and saves it to redis

  ## Parameters:
    - total_rounds: The number of rounds for the game.
  
  ## Returns:
    - {:ok, game_session}
    - {:error, reason}
  """
  def new_game_session(total_rounds) do
    # Create GameSession struct
    game_session = %GameSession{
      id: IdGen.generate_id(),
      state: "waiting_for_players",
      current_round: 0,
      total_rounds: total_rounds
    }

    # Save to redis
    case set_game_session(game_session) do
      {:ok, _status} ->
        {:ok, game_session}
      {:error, reason} ->
        {:error, reason}
    end
  end


  @doc """
  Adds a player to the given game

  ## Parameters:
    - game: The game to add the player to
    - player: The Player to be added
  """
  def add_player(%GameSession{} = game_session, %Player{} = player) do
    add_player(game_session.id, player)
  end


  @doc """
  Adds a player to the given game

  ## Parameters:
    - session_id: The Id of the game to add the player to
    - player: The Player to be added
  """
  def add_player(session_id, %Player{} = player) do
    player_list_id = session_id <> ":players"
    if player_name_taken?(session_id, player.name) do
      {:error, :name_already_taken}
    else
      Redix.command(:redix, ["LPUSH", player_list_id, player.id])
      Redix.command(:redix, ["EXPIRE", player_list_id, Soup.Game.game_exp])
      
      player
      |> Player.set_player
    end
  end


  @doc """
  Fetches all players that have joined the given game.
  """
  def get_all_players(session_id) do
    player_list = session_id <> ":players"
    {:ok, player_ids} = Redix.command(:redix, ["LRANGE", player_list, 0, -1])
    Enum.map(player_ids, fn pid -> Player.get_player(pid) end)
  end


  @doc """
  Fetches all piles that have been created
  """
  def get_all_piles(session_id) do
    pile_list = session_id <> ":piles"
    {:ok, pile_ids} = Redix.command(:redix, ["LRANGE", pile_list, 0, -1])
    IO.puts(pile_list)
    Enum.map(pile_ids, fn pid -> Pile.get_pile(pid) end)
  end


  @doc """
  Fetches a game session from redis

  ## Parameters:
  - session_id: The id of the game

  ## Returns:
    - {:ok, game} when found
    - {:error, reason}
  """
  def get_session(session_id) do
    case Redix.command(:redix, ["HGETALL", session_id]) do
      {:ok, []} -> {:error, :not_found}
      {:ok, data} ->
        {:ok, %GameSession{
          id: session_id,
          state: Enum.at(data, 1),
          current_round: String.to_integer(Enum.at(data, 3)),
          total_rounds: String.to_integer(Enum.at(data, 5))
        }}
      {:error, reason} -> {:error, reason}
    end
  end
  

  @doc """
  Sets the given sessions to in progress
  """
  def start_round(session_id) do
    case GameSession.get_session(session_id) do
      {:ok, session} ->
        session
        |> set_state("in_progress")
        |> set_current_round(session.current_round + 1)
        |> set_game_session()

        reset_all_players_for_round(session.id)
        :ok
      _ -> :error
    end
  end


  def remove_game(game_id) do
    clear_all_piles(game_id)
    clear_all_players(game_id)
    Redix.command(:redix, ["DEL", game_id])
  end
  

  def clear_all_players(game_id) do
    get_all_players(game_id)
    |> Enum.each(fn p -> Redix.command(:redix, ["DEL", p.id]) end)

    Redix.command(:redix, ["DEL", game_id <> ":players"])
  end


  def clear_all_piles(game_id) do
    piles = get_all_piles(game_id)
    Enum.map(piles, fn p -> Redix.command(:redix, ["DEL", p.id]) end)
    Redix.command(:redix, ["DEL", game_id <> ":piles"])
  end


  def set_all_player_scores(game_id) do
    players = get_all_players(game_id)
    players
    |> Enum.map(fn p -> Redix.command(:redix, ["HSET", p.id, "score", Player.player_round_score(p) + p.score]) end)
  end

  
  def rank_players(game_id) do
    players = get_all_players(game_id)
    
    scores = players
    |> Enum.map(fn p -> p.score end)
    |> Enum.sort
    |> Enum.reverse

    players
    |> Enum.each(fn p -> Player.set_rank(p, Enum.find_index(scores, fn s -> s == p.score end)) end)
  end


  defp reset_all_players_for_round(game_id) do
    player_list_key = game_id <> ":players"
    {:ok, player_ids} = Redix.command(:redix, ["LRANGE", player_list_key, 0, -1])
    Enum.map(player_ids, fn pid -> Player.reset_for_round(pid) end)
    :ok
  end


  defp set_state(%GameSession{} = session, state) do
    %{session | state: state}    
  end

  
  defp set_current_round(%GameSession{} = session, round) do
    %{session | current_round: round}
  end


  defp player_name_taken?(session_id, player_name) do
    GameSession.get_all_players(session_id)
    |> Enum.any?(fn p -> p.name == player_name end)
  end


  @doc """
  Saves a GameSession struct to redis hash

  ## Returns:
    - {:ok, game}
    - {:error, reason}

  ## Parameters:
    - game_session: The Game struct to be saved
  """
  defp set_game_session(%GameSession{} = game_session) do
    with {:ok, _} <- Redix.command(:redix, ["HSET", game_session.id, "state", game_session.state, "current_round", game_session.current_round, "total_rounds", game_session.total_rounds]),
      {:ok, _} <- Redix.command(:redix, ["EXPIRE", game_session.id, Soup.Game.game_exp])
    do
      {:ok, game_session}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end
end