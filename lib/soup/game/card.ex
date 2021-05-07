defmodule Soup.Game.Card do
  @derive [Poison.Encoder]
  @derive Jason.Encoder
  defstruct [:id, :value, :color, :player, :location, :player_color]
end