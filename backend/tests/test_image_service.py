"""Tests for image processing service."""
import os
from unittest.mock import patch, MagicMock
import pytest

from app.services.image_service import convert_image, ImageProcessingError


class TestImageService:
    def test_convert_invalid_format_raises(self, app):
        """Should raise for unsupported output format."""
        with app.app_context():
            with pytest.raises(ImageProcessingError, match="Unsupported"):
                convert_image('/tmp/test.png', '/tmp/out.bmp', 'bmp')

    def test_convert_image_success(self, app, tmp_path):
        """Should convert an image and return stats."""
        from PIL import Image as PILImage

        with app.app_context():
            # Create real test image
            input_path = str(tmp_path / 'input.png')
            output_path = str(tmp_path / 'output.jpg')

            img = PILImage.new('RGB', (100, 100), color='red')
            img.save(input_path, 'PNG')

            result = convert_image(input_path, output_path, 'jpg', quality=85)

            assert result['width'] == 100
            assert result['height'] == 100
            assert result['format'] == 'jpg'
            assert result['original_size'] > 0
            assert result['converted_size'] > 0
            assert os.path.exists(output_path)

    def test_convert_rgba_to_jpeg(self, app, tmp_path):
        """Should handle RGBA to JPEG conversion (strip alpha)."""
        from PIL import Image as PILImage

        with app.app_context():
            input_path = str(tmp_path / 'input_rgba.png')
            output_path = str(tmp_path / 'output.jpg')

            img = PILImage.new('RGBA', (50, 50), color=(255, 0, 0, 128))
            img.save(input_path, 'PNG')

            result = convert_image(input_path, output_path, 'jpg', quality=85)
            assert result['format'] == 'jpg'
            assert os.path.exists(output_path)