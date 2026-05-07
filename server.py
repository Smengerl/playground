#!/usr/bin/env python3
"""Minimal static file server for the Flitz story reader."""

import http.server
import socketserver

PORT = 8080

handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
