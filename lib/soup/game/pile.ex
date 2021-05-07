defmodule Soup.Game.Pile do
  alias Soup.Game.{Pile, Card, IdGen, Player}

  @derive [Poison.Encoder]
  @derive Jason.Encoder
  defstruct [:id, :color, :currentValue, :cards, :topPlayerColor]

  @doc """
  Creates a new pile

  ## Parameters
    - game_id: The id of the game to create the pile on
    - card: The card that starts the pile
  """
  def new_pile(game_id, %Card{} = card) do
    if (card.value != 1) do
      {:error, :invalid_value}
    else
      case Redix.command(:redix, ["HGET", game_id, "state"]) do
        {:ok, "in_progress"} ->
          pile_list_id = game_id <> ":piles"
          pile = %Pile{id: IdGen.generate_tagged_id(game_id), currentValue: 1, cards: [card], color: card.color, topPlayerColor: card.player_color}
          serialized = Poison.encode!(pile)
          Redix.command(:redix, ["SET", pile.id, serialized])
          Redix.command(:redix, ["LPUSH", pile_list_id, pile.id])

          if (card.location == "stack") do
            Player.subtract_player_stack(card.player)
          end

          Player.increment_cards_played(card.player)

          pile
        {:ok, state} when state != nil ->
          {:error, :game_not_in_progress}
        {:ok, nil} ->
          {:error, :game_does_not_exist}
      end
    end
  end

  @doc """
  Fetches a pile for rediss
  """
  def get_pile(pile_id) do
    IO.puts("getting pile " <> pile_id)
    case Redix.command(:redix, ["GET", pile_id]) do
      {:ok, pile} when pile != nil ->
        Poison.decode!(pile, as: %Pile{cards: [%Card{}]})
      {:ok, _} ->
        {:error, :not_found}
    end
  end

  @doc """
  Plays a card on the given pile
  """
  def play_card(pile_id, %Card{} = card) do
    resource = pile_id <> ":LOCK"

    case Redlock.lock(resource, 60) do
      {:ok, mutex} ->
        pile = get_pile(pile_id)
        cond do
          pile.color != card.color ->
            Redlock.unlock(resource, mutex)
            {:error, :wrong_color}
          card.value != pile.currentValue + 1 ->
            Redlock.unlock(resource, mutex)
            {:error, :wrong_value}
          true ->
            if (card.location == "stack") do
              Player.subtract_player_stack(card.player)
            end

            Player.increment_cards_played(card.player)
            updated_pile = %{pile | currentValue: card.value, cards: pile.cards ++ [card], topPlayerColor: card.player_color}
            serialized = Poison.encode!(updated_pile)
            Redix.command(:redix, ["SET", pile_id, serialized])
            Redlock.unlock(resource, mutex)
            {:ok, updated_pile}
        end
      :error ->
        {:error, :system_error}
    end
  end
end