import os
import pytest
from app import create_app


@pytest.fixture
def app():
    """Create application for testing."""
    os.environ['FLASK_ENV'] = 'testing'
    app = create_app()
    app.config.update({
        'TESTING': True,
    })
    yield app


@pytest.fixture
def client(app):
    """Flask test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Flask test CLI runner."""
    return app.test_cli_runner()
