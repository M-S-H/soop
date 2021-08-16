defmodule SoupWeb.SessionChannel do
  use SoupWeb, :channel

  alias Soup.Game.{Player, Hand, GameSession, Pile, Card}

  @doc """
  Hnadles request to join session channel
  """
  def join("session:" <> session_id, params, socket) do
    socket =
      socket
      |> assign(:session_id, session_id)
      |> assign(:player_id, params["player_id"])

    {:ok, socket}
  end


  @doc """
  Creates a new pile
  """
  def handle_in("new_pile", params, socket) do
    card = %Card{
      id: params["id"],
      value: params["value"],
      location: params["location"],
      player: params["player"],
      color: params["color"],
      player_color: params["player_color"]
    }

    pile = Pile.new_pile(socket.assigns.session_id, card)
    broadcast(socket, "new_pile_created", pile)
    {:reply, :ok, socket}
  end

  def handle_in("request_shuffle", _params, socket) do
    player = Player.get_player(socket.assigns.player_id)
    if player.leader do
      broadcast(socket, "shuffle", %{})
    end

    {:noreply, socket}
  end

  @doc """
  Play a card on an existing pile
  """
  def handle_in("play_card", %{"pile_id" => pile_id, "card" => card}, socket) do
    card = %Card{
      id: card["id"],
      value: card["value"],
      location: card["location"],
      player: card["player"],
      color: card["color"],
      player_color: card["player_color"]
    }

    case Pile.play_card(pile_id, card) do
      {:ok, updated_pile} ->
        broadcast(socket, "update_pile", updated_pile)
        {:reply, :ok, socket}
      {:error, _message} ->
        {:reply, :error, socket}
    end
  end


  @doc """
  Broadcasts that a player joined to all other players
  """
  def handle_in("player_joined", params, socket) do
    player = Player.get_player(params["playerId"])
    broadcast_from!(socket, "player_joined", Map.from_struct(player))
    {:noreply, socket}
  end


  @doc """
  Sets the given player's status as ready and notifies other players
  """
  def handle_in("set_ready", _params, socket) do
    player = Player.get_player(socket.assigns.player_id)
    Player.set_ready(player.id)
    broadcast(socket, "player_ready", %{player_id: player.id})
    hand = Hand.new_hand(player.id, player.color)
    {:reply, {:ok, Map.from_struct(hand)}, socket}
  end


  @doc """
  Notifiy all players that the round has started
  """
  def handle_in("start_round", _, socket) do
    case GameSession.start_round(socket.assigns.session_id) do
      :ok ->
        broadcast(socket, "round_started", %{})
        {:noreply, socket}
      true -> {:noreply, socket}
    end
  end


  @doc """
  Ends the round or game
  """
  def handle_in("soop", _, socket) do
    winning_player = Player.get_player(socket.assigns.player_id)
    {:ok, game} = GameSession.get_session(socket.assigns.session_id)

    GameSession.set_all_player_scores(socket.assigns.session_id)
    GameSession.rank_players(socket.assigns.session_id)

    players = GameSession.get_all_players(socket.assigns.session_id)
    results = %{
      roundWinner: winning_player.id,
      topPlayer: (players |> Enum.sort_by(fn p -> p.score end) |> List.first).id,
      playerResults: Enum.map(players, fn p -> %{
        playerId: p.id,
        stack: p.stack,
        cardsPlayed: p.cards_played,
        roundScore: (p.stack * -2) + p.cards_played,
        newScore: p.score,
        rank: p.rank,
        delta: p.delta
      } end)
    }

    Redix.command(:redix, ["HSET", socket.assigns.session_id, "state", "waiting_for_players"])
    GameSession.clear_all_piles(socket.assigns.session_id)

    case game.current_round == game.total_rounds do
      true ->
        GameSession.remove_game(socket.assigns.session_id)
        broadcast(socket, "game_over", %{"results" => results})
      false ->
        broadcast(socket, "end_of_round", %{"results" => results})
    end

    {:noreply, socket}
  end


  def handle_in("end_game", _, socket) do
    IO.puts(socket.assigns.session_id)
    GameSession.remove_game(socket.assigns.session_id)
    broadcast(socket, "game_ended", %{})
  end
end
