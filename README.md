# NodeJS WebSocket Server
### DISCORD: https://discord.com/invite/SZJqxUynrG
### Website: https://www.trainorcreations.com
### Donate: https://trainorcreations.com/donate

This project is a simple WebSocket server based off [otcv8botserver](https://github.com/OTCv8/otcv8botserver), built with Node.js using the `ws` library. The server automatically installs the required dependencies if they are missing.

## Requirements

- **Node.js**

Download and install Node.js from [https://nodejs.org/](https://nodejs.org/).

## Setup Instructions

Double click on `run.bat` which will start the BotServer.

## vBot Setup.
Find `_Loader.lua` add the text below to first line 

```lua
BotServer.url = "ws://localhost:8000/" -- add this line
-- load all otui files, order doesn't matter
```
Save `_Loader.lua`.

Reload your bot config and connect using the botserver panel.