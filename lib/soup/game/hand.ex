defmodule Soup.Game.Hand do
  alias Soup.Game.{IdGen, Card, Hand}

  @derive Jason.Encoder
  defstruct [:stack, :row, :hand]

  @doc """
  Constructs a new hand for the given player

  ## Parameters:
    - player_id: The id of the player that the hand will belong to

  ## Returns:
    - Hand struct
  """
  def new_hand(player_id, player_color) do
    # Construct a list of shuffled cards
    shuffled_cards =
      Enum.reduce(["red", "green", "blue", "yellow"], [], fn(color, list) -> list ++ Enum.reduce(1..10, [], fn(value, l) -> [%Card{id: IdGen.generate_id(), value: value, color: color, player: player_id, player_color: player_color} | l] end) end)
      |> List.flatten
      |> Enum.reverse
      |> Enum.shuffle

    # Categorize cards
    hand = %Hand{
      stack: Enum.slice(shuffled_cards, 0, 10) |> Enum.map(fn c -> %{c | location: "stack"} end),
      row: Enum.slice(shuffled_cards, 10, 3) |> Enum.map(fn c -> %{c | location: "row"} end),
      hand: Enum.slice(shuffled_cards, 13, 27) |> Enum.map(fn c -> %{c | location: "hand"} end)
    }

    # Verify that stack does not add to a value of 30 or more
    if (is_valid?(hand)) < 30 do
      hand
    else
      Hand.new_hand
    end

    hand
  end

  @doc """
  Determines whether a hand is valid. An invalid hand has a face value of 30 or more.

  ## Returns
    - true or false
  """
  defp is_valid?(%Hand{} = hand) do
    Enum.sum(Enum.map([Enum.at(hand.stack, 0) | hand.row], fn c -> c.value end))
  end
end