# AI Architecture

The AI Director is the flagship feature of SitePilot.

## Interface
The AI page (`/projects/[id]/ai`) utilizes a split-screen design:
1. **Left Panel**: Injects real-time project context into the AI's "system prompt" implicitly by visualizing it to the user.
2. **Right Panel**: A chat interface built with premium animations (glowing inputs, bouncing loading dots).

## Production AI Flow
In production, the chat should be routed to an Anthropic/OpenAI wrapper backend endpoint.
The endpoint will inject the current `ProjectDto` into the prompt context to ensure the AI speaks authoritatively about real-time project data.
