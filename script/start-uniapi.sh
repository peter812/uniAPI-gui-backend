#!/bin/bash
cd /home/runner/workspace/uniapi-main/backend
exec python -c "
import uvicorn
uvicorn.run('main:app', host='0.0.0.0', port=8001, log_level='info')
"
