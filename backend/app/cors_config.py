import os
from urllib.parse import urlparse

def get_allowed_origins():
    """
    Get allowed origins from environment variable or defaults.
    Supports multiple origins separated by comma.
    """
    # Default includes common local development ports
    default_origins = 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000'
    origins_str = os.getenv('CORS_ALLOWED_ORIGINS', default_origins)
    return [origin.strip() for origin in origins_str.split(',')]

def is_origin_allowed(origin):
    """Check if the request origin is in the allowed list."""
    if not origin:
        return False

    allowed_origins = get_allowed_origins()

    # Check exact match
    if origin in allowed_origins:
        return True

    # Check wildcard subdomains (e.g., *.yourdomain.com)
    for allowed in allowed_origins:
        if allowed.startswith('*.'):
            domain = allowed[2:]  # Remove *.
            origin_domain = urlparse(origin).netloc
            if origin_domain.endswith(domain):
                return True

    return False

def get_allowed_headers():
    """
    Get allowed headers from environment variable or defaults.
    Supports additional custom headers separated by comma.
    """
    default_headers = [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Browser-Locale',
        'X-Timezone'
    ]

    # Allow additional custom headers via environment variable
    custom_headers_str = os.getenv('CORS_ALLOWED_HEADERS', '')
    custom_headers = [h.strip() for h in custom_headers_str.split(',') if h.strip()]

    all_headers = default_headers + custom_headers
    return ','.join(all_headers)

def get_cors_origin(request):
    """
    Get the appropriate CORS origin for the response.
    Returns the request's origin if allowed, otherwise returns
    the first allowed origin for backward compatibility.
    """
    origin = request.headers.get('Origin')

    if is_origin_allowed(origin):
        return origin

    # For backward compatibility, return the first allowed origin
    # This ensures existing functionality continues to work
    allowed = get_allowed_origins()
    return allowed[0] if allowed else 'http://localhost:3000'