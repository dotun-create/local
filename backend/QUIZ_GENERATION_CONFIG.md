# AI Quiz Generation Configuration Guide

This guide explains how to configure the AI-powered quiz generation feature in the ORMS backend.

## Required Environment Variables

### Essential Configuration

```bash
# Required: OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**How to get an API key:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and add it to your .env file

## Optional Configuration Variables

### OpenAI Model Settings

```bash
# Model Selection (default: gpt-3.5-turbo)
OPENAI_MODEL=gpt-3.5-turbo

# Available options:
# - gpt-3.5-turbo: Fast and cost-effective
# - gpt-4: Higher quality but more expensive
# - gpt-4-turbo-preview: Latest GPT-4 model
# - gpt-4o: Optimized GPT-4 model
```

### Custom API Endpoints

```bash
# Custom OpenAI API Base URL (optional)
# Use for Azure OpenAI, proxy services, or OpenAI-compatible APIs
OPENAI_API_BASE=https://your-custom-endpoint.com/v1

# Examples:
# Azure OpenAI: https://your-resource-name.openai.azure.com/
# LocalAI: http://localhost:8080/v1
# Ollama: http://localhost:11434/v1
```

### Organization & Authentication

```bash
# OpenAI Organization ID (optional)
# Only needed if using organization-specific API keys
OPENAI_ORG_ID=org-your-organization-id
```

### Request Configuration

```bash
# Request timeout in seconds (default: 30)
OPENAI_TIMEOUT=30

# Maximum retries for failed requests (default: 3)
OPENAI_MAX_RETRIES=3
```

### Quiz Generation Defaults

```bash
# Default number of questions when not specified (default: 5)
DEFAULT_QUIZ_QUESTIONS=5

# Maximum questions allowed per quiz - security limit (default: 20)
MAX_QUIZ_QUESTIONS=20

# Default difficulty level (default: medium)
DEFAULT_QUIZ_DIFFICULTY=medium

# Available difficulty levels (default: easy,medium,hard)
QUIZ_DIFFICULTY_LEVELS=easy,medium,hard
```

## Configuration Validation

### API Endpoint
Check your configuration using the validation endpoint:

```bash
GET /api/quiz-generator/validate-config
Authorization: Bearer <admin-jwt-token>
```

### Response Example
```json
{
  "configured": true,
  "message": "OpenAI API configured correctly (Model: gpt-3.5-turbo)",
  "missing_variables": [],
  "config_details": {
    "model": "gpt-3.5-turbo",
    "base_url": "https://api.openai.com/v1",
    "timeout": 30,
    "max_retries": 3,
    "max_questions": 20,
    "default_difficulty": "medium",
    "available_difficulties": ["easy", "medium", "hard"],
    "organization_configured": false
  }
}
```

## Cost Considerations

### Token Usage Estimates
- **gpt-3.5-turbo**: ~$0.01-0.03 per quiz (5 questions)
- **gpt-4**: ~$0.10-0.30 per quiz (5 questions)
- **gpt-4-turbo**: ~$0.05-0.15 per quiz (5 questions)

### Cost Optimization Tips
1. Use `gpt-3.5-turbo` for most quiz generation
2. Reserve `gpt-4` for complex or specialized topics
3. Set reasonable `MAX_QUIZ_QUESTIONS` limits
4. Monitor usage through OpenAI dashboard

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
```json
{"error": "Failed to generate questions: OpenAI API key is invalid or missing"}
```
**Solution:** Verify your `OPENAI_API_KEY` is correct and active.

#### 2. Rate Limit Errors
```json
{"error": "Failed to generate questions: OpenAI API rate limit exceeded"}
```
**Solution:** 
- Wait and retry
- Upgrade your OpenAI plan
- Increase `OPENAI_MAX_RETRIES` and `OPENAI_TIMEOUT`

#### 3. Model Not Found
```json
{"error": "Failed to generate questions: The model 'gpt-4' does not exist"}
```
**Solution:** 
- Check if you have access to the specified model
- Use `gpt-3.5-turbo` instead
- Verify model name spelling

#### 4. Network/Proxy Issues
```json
{"error": "Failed to generate questions: Connection timeout"}
```
**Solution:**
- Check internet connectivity
- Verify `OPENAI_API_BASE` if using custom endpoint
- Increase `OPENAI_TIMEOUT` value

### Debug Mode
Enable detailed logging by setting:
```bash
LOG_LEVEL=DEBUG
```

## Security Best Practices

1. **API Key Security:**
   - Never commit `.env` files to version control
   - Use environment-specific API keys
   - Rotate keys regularly

2. **Rate Limiting:**
   - Set appropriate `MAX_QUIZ_QUESTIONS` limits
   - Implement application-level rate limiting
   - Monitor usage patterns

3. **Input Validation:**
   - The system validates all inputs automatically
   - Custom difficulty levels can be configured
   - Questions are sanitized before storage

## Azure OpenAI Configuration

For Azure OpenAI Service:

```bash
OPENAI_API_KEY=your-azure-openai-key
OPENAI_API_BASE=https://your-resource-name.openai.azure.com/
OPENAI_MODEL=gpt-35-turbo  # Note: Azure uses different model names
```

## Local/Self-Hosted AI Configuration

For local AI services like Ollama or LocalAI:

```bash
OPENAI_API_KEY=not-needed-for-local  # Some local services don't require a key
OPENAI_API_BASE=http://localhost:11434/v1  # Ollama example
OPENAI_MODEL=llama2  # Model name depends on your local setup
```

## Production Recommendations

1. **Model Selection:** Use `gpt-3.5-turbo` for cost efficiency
2. **Timeouts:** Set `OPENAI_TIMEOUT=60` for production
3. **Retries:** Set `OPENAI_MAX_RETRIES=2` to avoid long waits
4. **Limits:** Set `MAX_QUIZ_QUESTIONS=15` for reasonable limits
5. **Monitoring:** Enable logging and monitor API usage

## Testing the Configuration

After setting up your environment variables, test the configuration:

```python
# Run the validation example
python example_usage.py

# Or test programmatically
from app.helpers.question_generator import validate_openai_config
result = validate_openai_config()
print(f"Configuration valid: {result['valid']}")
```