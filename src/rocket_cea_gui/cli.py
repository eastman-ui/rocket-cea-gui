from __future__ import annotations
import argparse
import sys
import webbrowser

import uvicorn


def main() -> None:
    parser = argparse.ArgumentParser(prog="rocket-cea-gui", description="Rocket CEA GUI server")
    subparsers = parser.add_subparsers(dest="command")

    serve_parser = subparsers.add_parser("serve", help="Start the FastAPI server")
    serve_parser.add_argument("--host", default="127.0.0.1", help="Server host")
    serve_parser.add_argument("--port", type=int, default=8000, help="Server port")
    serve_parser.add_argument("--no-browser", action="store_true", help="Do not open browser")
    serve_parser.add_argument("--reload", action="store_true", help="Enable auto-reload")

    args = parser.parse_args()

    if args.command != "serve":
        parser.print_help()
        sys.exit(1)

    if not args.no_browser:
        url = f"http://{args.host}:{args.port}/"
        webbrowser.open(url)

    uvicorn.run(
        "rocket_cea_gui.server:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()