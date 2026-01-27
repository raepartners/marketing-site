#!/usr/bin/env -S uv run --script
#
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "pillow",
#     "typer",
# ]
# [tool.uv]
# exclude-newer = "2026-01-27T00:00:00Z"
# ///
"""
Generate Open Graph image for rae marketing site.

Creates a 1200x630 PNG suitable for social media link previews,
using the official rae-logo.svg centered with minimal padding.

Requires: rsvg-convert (brew install librsvg)

Usage:
    ./scripts/generate-og-image.py
    ./scripts/generate-og-image.py --output custom-path.png

Maintenance:
    uv add --script scripts/generate-og-image.py 'package-name'
    uvx ruff format scripts/generate-og-image.py
    uvx ruff check scripts/generate-og-image.py

References:
    - PEP 723: https://peps.python.org/pep-0723/
    - uv scripts: https://docs.astral.sh/uv/guides/scripts/
"""

import subprocess
import tempfile
from pathlib import Path

import typer
from PIL import Image

# Brand colors (from global.css solarpunk theme)
BACKGROUND = (253, 251, 247)  # Warm white #fdfbf7
PRIMARY_HEX = "#c4933d"  # Solar gold


def main(
    output: Path = Path("public/images/og-default.png"),
    width: int = 1200,
    height: int = 630,
) -> None:
    """Generate the OG image using the official SVG logo."""
    # Create base image with warm background
    img = Image.new("RGB", (width, height), BACKGROUND)

    # Load the official SVG logo
    svg_path = Path("public/images/rae-logo.svg")
    if not svg_path.exists():
        typer.echo(f"Error: {svg_path} not found", err=True)
        raise typer.Exit(1)

    svg_content = svg_path.read_text()

    # Replace currentColor with brand gold, remove white background rect
    svg_modified = svg_content.replace("currentColor", PRIMARY_HEX)
    svg_modified = svg_modified.replace(
        '<rect width="400" height="280" fill="white" rx="20" ry="20"/>',
        "",
    )

    # Scale logo larger than canvas to crop out SVG's built-in padding
    logo_height = int(height * 1.20)
    # Original SVG is 400x280, maintain aspect ratio
    logo_width = int(logo_height * (400 / 280))

    # Write modified SVG to temp file and convert with rsvg-convert
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".svg", delete=False
    ) as svg_file:
        svg_file.write(svg_modified)
        svg_temp_path = svg_file.name

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as png_file:
        png_temp_path = png_file.name

    try:
        # Use rsvg-convert (from librsvg) to render SVG to PNG
        result = subprocess.run(
            [
                "rsvg-convert",
                "-w",
                str(logo_width),
                "-h",
                str(logo_height),
                "-o",
                png_temp_path,
                svg_temp_path,
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            typer.echo(f"Error running rsvg-convert: {result.stderr}", err=True)
            typer.echo("Install with: brew install librsvg", err=True)
            raise typer.Exit(1)

        # Open rendered logo
        logo = Image.open(png_temp_path).convert("RGBA")

        # Center both horizontally and vertically
        x = (width - logo_width) // 2
        y = (height - logo_height) // 2

        img.paste(logo, (x, y), logo)

    finally:
        # Clean up temp files
        Path(svg_temp_path).unlink(missing_ok=True)
        Path(png_temp_path).unlink(missing_ok=True)

    # Save
    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(output, "PNG", optimize=True)
    typer.echo(f"Generated OG image: {output}")


if __name__ == "__main__":
    typer.run(main)
