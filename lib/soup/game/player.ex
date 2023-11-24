defmodule Soup.Game.Player do
  alias Soup.Game.{IdGen, Player}

  @derive [Poison.Encoder]
  defstruct [:id, :name, :color, :cards_played, :score, :leader, :ready, :stack, :rank, :delta]

  @doc """
  Returns a new player
  """
  def new_player(name, color, leader \\ false) do
    %Player{
      id: "P:" <> IdGen.generate_id(),
      name: name,
      color: color,
      score: 0,
      leader: leader,
      ready: false,
      stack: 0,
      cards_played: 0,
      rank: 0,
      delta: "eq"
    }
  end

  def set_rank(%Player{} = player, rank) do
    player = cond do
      rank < player.rank -> %{player | delta: "gt"}
      rank > player.rank -> %{player | delta: "lt"}
      true -> %{player | delta: "eq"}
    end

    player = %{player | rank: rank}    
    Redix.command(:redix, ["HSET", player.id, "rank", player.rank, "delta", player.delta])
  end


  @doc """
  Computes the player's round score
  """
  def player_round_score(%Player{} = player) do
    (player.stack * -2) + player.cards_played
  end


  @doc """
  Decrements the player's stack counnt
  """
  def subtract_player_stack(player_id) do
    {:ok, stack} = Redix.command(:redix, ["HGET", player_id, "stack"])
    IO.puts(String.to_integer(stack) - 1)
    Redix.command(:redix, ["HSET", player_id, "stack", String.to_integer(stack) - 1])
  end


  @doc """
  Increments the player's played cards count
  """
  def increment_cards_played(player_id) do
    {:ok, stack} = Redix.command(:redix, ["HGET", player_id, "cards_played"])
    Redix.command(:redix, ["HSET", player_id, "cards_played", String.to_integer(stack) + 1])
  end


  @doc """
  Fetches a player with the given Id from redis
  """
  def get_player(player_id) do
    IO.puts player_id
    case Redix.command(:redix, ["HGETALL", player_id]) do
      {:ok, player} ->
        %Player{
          id: Enum.at(player, 1),
          name: Enum.at(player, 3),
          color: Enum.at(player, 5),
          leader: Enum.at(player, 7) == "true",
          ready: Enum.at(player, 9) == "true",
          score: String.to_integer(Enum.at(player, 11)),
          cards_played: String.to_integer(Enum.at(player, 13)),
          stack: String.to_integer(Enum.at(player, 15)),
          rank:  String.to_integer(Enum.at(player, 17)),
          delta: Enum.at(player, 19)
        }
      _ -> {:error}
    end
  end


  @doc """
  Resets the player's record for a new round
  """
  def reset_for_round(player_id) do
    case Redix.command(:redix, ["HSET", player_id, "stack", 10, "cards_played", 0, "ready", false]) do
      {:ok, _} -> {:ok, :done}
      {:error, reason} -> {:error, reason}
    end
  end


  @doc """
  Saves the given player to redis
  """
  def set_player(%Player{} = player) do
    case Redix.command(:redix, ["HSET", player.id, "id", player.id, "name", player.name, "color", player.color, "leader", player.leader, "ready", player.ready, "score", player.score, "cards_played", player.cards_played, "stack", player.stack, "rank", player.rank, "delta", player.delta]) do
      {:ok, _} ->
        Redix.command(:redix, ["EXPIRE", player.id, Soup.Game.game_exp])
        {:ok, player}
      {:error, reason} -> {:error, reason}
    end
  end


  @doc """
  Sets the given player's status as ready
  """
  def set_ready(player_id) do
    Redix.command(:redix, ["HSET", player_id, "ready", true])
    :ok
  end
end