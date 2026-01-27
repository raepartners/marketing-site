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
using the rae sunrise design and brand colors.

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

import math
from pathlib import Path

import typer
from PIL import Image, ImageDraw, ImageFont

# Brand colors (from global.css solarpunk theme)
BACKGROUND = (253, 251, 247)  # Warm white #fdfbf7
PRIMARY = (196, 147, 61)  # Solar gold #c4933d
FOREGROUND = (41, 37, 36)  # Deep brown #292524


def draw_sun_logo(
    draw: ImageDraw.ImageDraw,
    center_x: int,
    center_y: int,
    scale: float = 1.0,
) -> None:
    """Draw the rae sunrise logo."""
    sun_radius = int(55 * scale)
    horizon_y = center_y + int(10 * scale)

    # Draw sun arc (top 40% of circle above horizon)
    sun_bbox = [
        center_x - sun_radius,
        horizon_y - sun_radius,
        center_x + sun_radius,
        horizon_y + sun_radius,
    ]
    # Draw arc from 200 to 340 degrees (the visible part above horizon)
    draw.arc(sun_bbox, start=200, end=340, fill=PRIMARY, width=int(4 * scale))

    # Draw horizon line
    horizon_half_width = int(117 * scale)
    draw.line(
        [
            (center_x - horizon_half_width, horizon_y),
            (center_x + horizon_half_width, horizon_y),
        ],
        fill=PRIMARY,
        width=int(2 * scale),
    )

    # Draw rays
    ray_data = [
        (-73.5, 0.65),  # angle, length multiplier
        (-58.8, 0.85),
        (-44.1, 0.70),
        (-29.4, 0.95),
        (-14.7, 0.75),
        (0, 1.0),
        (14.7, 0.70),
        (29.4, 0.95),
        (44.1, 0.65),
        (58.8, 0.90),
        (73.5, 0.65),
    ]

    ray_start_radius = int(60 * scale)
    ray_base_length = int(55 * scale)

    for angle_deg, length_mult in ray_data:
        angle_rad = math.radians(angle_deg - 90)  # -90 to make 0 point up
        start_x = center_x + int(ray_start_radius * math.cos(angle_rad))
        start_y = horizon_y + int(ray_start_radius * math.sin(angle_rad))

        ray_length = int(ray_base_length * length_mult)
        end_x = center_x + int((ray_start_radius + ray_length) * math.cos(angle_rad))
        end_y = horizon_y + int((ray_start_radius + ray_length) * math.sin(angle_rad))

        draw.line(
            [(start_x, start_y), (end_x, end_y)],
            fill=PRIMARY,
            width=int(2.5 * scale),
        )

        # Add circuit node (small circle) on some rays
        if abs(angle_deg) in [73.5, 44.1, 29.4, 14.7, 58.8]:
            node_radius = int(4 * scale)
            draw.ellipse(
                [
                    end_x - node_radius,
                    end_y - node_radius,
                    end_x + node_radius,
                    end_y + node_radius,
                ],
                outline=PRIMARY,
                width=int(2 * scale),
            )


def main(
    output: Path = Path("public/images/og-default.png"),
    width: int = 1200,
    height: int = 630,
) -> None:
    """Generate the OG image."""
    # Create base image with warm background
    img = Image.new("RGB", (width, height), BACKGROUND)
    draw = ImageDraw.Draw(img)

    # Draw the sun logo centered, in upper portion
    logo_center_x = width // 2
    logo_center_y = int(height * 0.38)
    logo_scale = 2.8  # Scale up for OG image

    draw_sun_logo(draw, logo_center_x, logo_center_y, logo_scale)

    # Add tagline text at bottom
    tagline = "Responsible. Autonomous. Engineering."

    # Try system fonts with fallback
    font_size = 38
    font = None
    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSText.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for font_path in font_paths:
        try:
            font = ImageFont.truetype(font_path, font_size)
            break
        except OSError:
            continue

    if font is None:
        font = ImageFont.load_default()

    # Center text horizontally
    bbox = draw.textbbox((0, 0), tagline, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = (width - text_width) // 2
    text_y = height - 110

    draw.text((text_x, text_y), tagline, fill=FOREGROUND, font=font)

    # Save
    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(output, "PNG", optimize=True)
    typer.echo(f"Generated OG image: {output}")


if __name__ == "__main__":
    typer.run(main)
