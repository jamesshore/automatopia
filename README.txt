Automatitopia
=============

This repository contains the example code for the "Lessons Learned: Automatitopia" episode of James Shore's "Let's Code: Test-Driven Javascript" screencast. For details, the video, and a transcript, see http://letscodejavascript.com .


Building and Testing
--------------------

Before building for the first time:
1. Install Node.js [http://nodejs.org/download/]
2. Download and unzip source code into "automatopia" directory
3. All commands must run from root of source code tree: `cd automatopia`

To build:
1. Run `./jake.sh` (Unix/Mac) or `jake` (Windows)


Continuous Integration
----------------------

Before integrating for the first time:
1. Follow the steps for "Building and Testing" first.


Deploying
---------

Before deploying for the first time:
1. Follow the steps for "Continuous Integration" first.
2. Install the Heroku Toolbelt [https://toolbelt.heroku.com/]
3. Sign up for a Heroku account
4. Log in to Heroku: `heroku login`
5. Create a Heroku application: `heroku create <app_name>`
6. 
