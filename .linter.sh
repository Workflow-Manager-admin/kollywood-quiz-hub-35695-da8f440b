#!/bin/bash
cd /home/kavia/workspace/code-generation/kollywood-quiz-hub-35695-da8f440b/kollywood_quiz_hub
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

