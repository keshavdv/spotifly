## What is it
Open-source Spotify Connect server that runs on anything with Node.js

## Dependencies
The server uses node-speaker so you may need to install the ALSA headers with:
`sudo apt-get install libasound2-dev`

## Usage
To run the server

    npm install -g spotifly
    spotifly -u <username> -p <password> -n "My Awesome Speakers"

The parameters are optional on the command line as the program will prompt if they are missing.

## Authors
Keshav Varma

## References
Heavily based on code from:
* node-spotify-web ([github](https://github.com/TooTallNate/node-spotify-web))
