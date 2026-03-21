"""Tests for XML sitemap exposure."""


def test_sitemap_endpoint(client):
    response = client.get('/sitemap.xml')
    assert response.status_code == 200
    assert 'xml' in response.content_type

    body = response.get_data(as_text=True)
    assert 'https://dociva.io/tools/pdf-to-word' in body
    assert 'https://dociva.io/pdf-to-word' in body
    assert 'https://dociva.io/ar/pdf-to-word' in body
    assert 'https://dociva.io/arabic-pdf-tools' in body
