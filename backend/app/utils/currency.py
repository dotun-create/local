"""
Currency utility functions for Troupe Academy
Handles currency formatting and mapping based on country/currency codes
"""

def get_currency_symbol(currency_code):
    """
    Get currency symbol from currency code
    """
    currency_symbols = {
        'GBP': '£',
        'USD': '$', 
        'NGN': '₦',
        'CAD': 'C$',
        'EUR': '€',
        'JPY': '¥',
        'AUD': 'A$'
    }
    return currency_symbols.get(currency_code, currency_code)

def get_currency_from_country(country):
    """
    Map country names to currency codes
    """
    if not country:
        return 'GBP'  # Default currency
    
    country_currency_map = {
        # UK variants
        'UK': 'GBP',
        'United Kingdom': 'GBP', 
        'England': 'GBP',
        'Scotland': 'GBP',
        'Wales': 'GBP',
        'Northern Ireland': 'GBP',
        'Britain': 'GBP',
        'Great Britain': 'GBP',
        
        # US variants  
        'US': 'USD',
        'USA': 'USD',
        'United States': 'USD',
        'United States of America': 'USD',
        'America': 'USD',
        
        # Nigeria
        'Nigeria': 'NGN',
        'Nigerian': 'NGN',
        
        # Canada
        'Canada': 'CAD',
        'Canadian': 'CAD',
        
        # Other common countries
        'Germany': 'EUR',
        'France': 'EUR',
        'Italy': 'EUR',
        'Spain': 'EUR',
        'Netherlands': 'EUR',
        'Japan': 'JPY',
        'Australia': 'AUD'
    }
    
    # Try exact match first
    if country in country_currency_map:
        return country_currency_map[country]
    
    # Try case-insensitive match
    country_lower = country.lower()
    for key, value in country_currency_map.items():
        if key.lower() == country_lower:
            return value
    
    # Try partial match
    for key, value in country_currency_map.items():
        if key.lower() in country_lower or country_lower in key.lower():
            return value
    
    return 'GBP'  # Default currency

def format_currency(amount, currency_code='GBP', show_symbol=True, decimal_places=2):
    """
    Format currency amount with proper symbol and formatting
    
    Args:
        amount (float): The amount to format
        currency_code (str): Currency code (e.g., 'GBP', 'USD')
        show_symbol (bool): Whether to show currency symbol
        decimal_places (int): Number of decimal places to show
        
    Returns:
        str: Formatted currency string
    """
    if amount is None:
        amount = 0.0
    
    try:
        amount = float(amount)
    except (ValueError, TypeError):
        amount = 0.0
    
    # Format the number
    formatted_amount = f"{amount:.{decimal_places}f}"
    
    if show_symbol:
        symbol = get_currency_symbol(currency_code)
        
        # Different formatting for different currencies
        if currency_code in ['USD', 'CAD', 'AUD']:
            return f"{symbol}{formatted_amount}"
        elif currency_code == 'EUR':
            return f"{formatted_amount}€"
        elif currency_code == 'JPY':
            # Japanese yen typically doesn't use decimal places
            return f"¥{amount:.0f}"
        elif currency_code == 'NGN':
            return f"₦{formatted_amount}"
        else:  # GBP and others
            return f"{symbol}{formatted_amount}"
    else:
        return formatted_amount

def format_currency_for_display(amount, currency_code='GBP'):
    """
    Format currency for display in UI components
    Uses appropriate formatting for each currency
    """
    return format_currency(amount, currency_code, show_symbol=True, decimal_places=2)

def format_currency_input(amount, currency_code='GBP'):
    """
    Format currency for input fields (usually without symbol)
    """
    return format_currency(amount, currency_code, show_symbol=False, decimal_places=2)

def get_currency_info(currency_code='GBP'):
    """
    Get detailed currency information
    
    Returns:
        dict: Currency information including symbol, name, and formatting rules
    """
    currency_info = {
        'GBP': {
            'name': 'British Pound',
            'symbol': '£',
            'decimal_places': 2,
            'symbol_position': 'before'
        },
        'USD': {
            'name': 'US Dollar',
            'symbol': '$',
            'decimal_places': 2,
            'symbol_position': 'before'
        },
        'NGN': {
            'name': 'Nigerian Naira',
            'symbol': '₦',
            'decimal_places': 2,
            'symbol_position': 'before'
        },
        'CAD': {
            'name': 'Canadian Dollar',
            'symbol': 'C$',
            'decimal_places': 2,
            'symbol_position': 'before'
        },
        'EUR': {
            'name': 'Euro',
            'symbol': '€',
            'decimal_places': 2,
            'symbol_position': 'after'
        },
        'JPY': {
            'name': 'Japanese Yen',
            'symbol': '¥',
            'decimal_places': 0,
            'symbol_position': 'before'
        },
        'AUD': {
            'name': 'Australian Dollar',
            'symbol': 'A$',
            'decimal_places': 2,
            'symbol_position': 'before'
        }
    }
    
    return currency_info.get(currency_code, currency_info['GBP'])

def get_supported_currencies():
    """
    Get list of all supported currencies
    
    Returns:
        list: List of dictionaries with currency information
    """
    currencies = ['GBP', 'USD', 'NGN', 'CAD', 'EUR', 'JPY', 'AUD']
    return [
        {
            'code': code,
            **get_currency_info(code)
        }
        for code in currencies
    ]

def validate_currency_code(currency_code):
    """
    Validate if a currency code is supported
    
    Args:
        currency_code (str): Currency code to validate
        
    Returns:
        bool: True if supported, False otherwise
    """
    supported_codes = ['GBP', 'USD', 'NGN', 'CAD', 'EUR', 'JPY', 'AUD']
    return currency_code in supported_codes

def convert_price_display(price, currency_code, country=None):
    """
    Convert price for display, automatically determining currency from country if needed
    
    Args:
        price (float): Price amount
        currency_code (str): Currency code, if None will determine from country
        country (str): Country name to determine currency from
        
    Returns:
        str: Formatted price string
    """
    if not currency_code and country:
        currency_code = get_currency_from_country(country)
    elif not currency_code:
        currency_code = 'GBP'
    
    return format_currency_for_display(price, currency_code)