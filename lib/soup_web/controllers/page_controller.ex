defmodule SoupWeb.PageController do
  use SoupWeb, :controller

  def index(conn, _) do
    conn
    |> put_resp_header("content-type", "text/html; charset=utf-8")
    |> Plug.Conn.send_file(200, "priv/static/index.html")
    # |> halt()
  end

  # def index(conn, _params) do
  #   render(conn, "index.html")
  # end
end
