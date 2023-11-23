defmodule Soup.Game.IdGen do
   @doc """
  Generates a five character id

  Returns: five character string
  """
  def generate_id do
    Ecto.UUID.generate()
    |> String.slice(0..4)
    |> String.upcase
  end

  def generate_tagged_id(tag) do
    generate_id() <> ":" <> tag
  end
end